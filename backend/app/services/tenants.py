import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID

from app.crud import tenants as crud_tenants
from app.schemas.tenant import OnboardingHandoffStatus, TenantCreate
from app.models.tenant import Tenant as TenantModel
from app.models.user import User
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


def evaluate_handoff_readiness(db: Session, tenant: TenantModel) -> dict:
    checks = []

    checks.append({"stage": "preboot", "status": "ok" if tenant.slug else "unresolved"})

    current_tenant = db.query(TenantModel).filter(TenantModel.slug == tenant.slug).first()
    checks.append({"stage": "current", "status": "ok" if current_tenant else "unresolved"})

    login_user = db.query(User).filter(User.tenant_id == tenant.id).first()
    checks.append({"stage": "login", "status": "ok" if login_user else "unresolved"})

    unresolved = [check for check in checks if check["status"] != "ok"]

    if unresolved:
        stage_prefix = {
            "preboot": "CREATE",
            "current": "CONTEXT",
            "login": "LOGIN",
        }.get(unresolved[0]["stage"], "CONTEXT")
        return {
            "registration_outcome": "success",
            "handoff_status": "action_required",
            "checks": checks,
            "fallback_actions": {"retry": True, "open": True, "copy": True},
            "user_message_key": "onboarding.handoff_action_required",
            "support_code": f"{stage_prefix}-UNRESOLVED",
        }

    return {
        "registration_outcome": "success",
        "handoff_status": "ready",
        "checks": checks,
        "fallback_actions": {"retry": True, "open": True, "copy": True},
        "user_message_key": "onboarding.handoff_ready",
        "support_code": "CREATE-SUCCESS",
    }


def create_tenant(db: Session, tenant_in: TenantCreate) -> dict:
    """
    Creates a new tenant and initial admin user atomically.
    """
    if crud_tenants.get_tenant_by_slug(db, slug=tenant_in.slug):
        raise HTTPException(
            status_code=400,
            detail="A tenant with this slug already exists."
        )

    username_prefix = tenant_in.email.split("@", 1)[0]
    admin_username = f"{tenant_in.slug}-{username_prefix}"[:100]

    try:
        tenant = crud_tenants.create_tenant_in_transaction(db, tenant=tenant_in)
        db.flush()

        admin_user = User(
            tenant_id=tenant.id,
            username=admin_username,
            email=tenant_in.email,
            password_hash=get_password_hash(tenant_in.admin_password),
            name=tenant_in.name,
        )
        db.add(admin_user)

        db.commit()
        db.refresh(tenant)

        try:
            onboarding = evaluate_handoff_readiness(db, tenant)
        except Exception as readiness_exc:
            logger.warning(
                "Tenant handoff readiness check degraded for slug %s: %s",
                tenant.slug,
                readiness_exc,
            )
            onboarding = {
                "registration_outcome": "success",
                "handoff_status": "action_required",
                "checks": [
                    {"stage": "preboot", "status": "ok"},
                    {"stage": "current", "status": "unresolved"},
                    {"stage": "login", "status": "ok"},
                ],
                "fallback_actions": {"retry": True, "open": True, "copy": True},
                "user_message_key": "onboarding.handoff_action_required",
                "support_code": "CONTEXT-UNRESOLVED",
            }

        return {
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "address": tenant.address,
            "city": tenant.city,
            "postal_code": tenant.postal_code,
            "phone": tenant.phone,
            "email": tenant.email,
            "website": tenant.website,
            "cif": tenant.cif,
            "logo_url": tenant.logo_url,
            "created_at": tenant.created_at,
            "updated_at": tenant.updated_at,
            "onboarding": OnboardingHandoffStatus(**onboarding),
        }
    except Exception as exc:
        db.rollback()
        logger.exception(
            "Tenant onboarding failed for slug %s", tenant_in.slug, exc_info=exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete registration at this time. Please try again.",
        )

def get_tenant(db: Session, tenant_id: UUID) -> TenantModel:
    tenant = crud_tenants.get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

def get_tenant_by_slug(db: Session, slug: str) -> TenantModel:
    tenant = crud_tenants.get_tenant_by_slug(db, slug)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant
