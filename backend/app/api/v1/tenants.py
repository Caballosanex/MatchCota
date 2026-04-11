from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Any, List

from app.database import get_db
from app.config import settings
from app.models.tenant import Tenant as TenantModel
from app.schemas.tenant import TenantCreate, Tenant, TenantRegistrationResponse
from app.core.tenant import resolve_tenant_slug_for_request
from app.services import tenants as tenants_service

router = APIRouter()


@router.get("/", response_model=List[Tenant])
def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Llistar tots els tenants (protectores) registrades.

    En producció retorna 403 — cada protectora viu al seu subdomini,
    no cal llistar-les totes. En dev, obert per la landing page.
    """
    if settings.is_production():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint no disponible en producció"
        )

    from app.crud import tenants as crud_tenants
    return crud_tenants.get_tenants(db, skip=skip, limit=limit)


@router.get("/current", response_model=Tenant)
def get_current_tenant_info(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Obtenir informació del tenant actual (públic).

    Usat pel frontend per mostrar logo, nom, etc. de la protectora.
    El tenant es determina pel header X-Tenant-Slug o subdomini.
    """
    tenant_slug = resolve_tenant_slug_for_request(request, support_stage="CONTEXT")
    if not tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "registration_outcome": "denied",
                "handoff_status": "tenant_context_missing",
                "user_message_key": "context.tenant_missing",
                "support_code": "CONTEXT-TENANT_MISSING",
            },
        )

    tenant = db.query(TenantModel).filter(TenantModel.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "registration_outcome": "denied",
                "handoff_status": "tenant_not_found",
                "user_message_key": "context.tenant_not_found",
                "support_code": "CONTEXT-TENANT_NOT_FOUND",
            },
        )

    return tenant


@router.post("", response_model=TenantRegistrationResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=TenantRegistrationResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a new tenant (Protectora).
    """
    return tenants_service.create_tenant(db, tenant_in)
