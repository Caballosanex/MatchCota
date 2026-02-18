from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List

from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate

def get_tenant(db: Session, tenant_id: UUID) -> Optional[Tenant]:
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()

def get_tenant_by_slug(db: Session, slug: str) -> Optional[Tenant]:
    return db.query(Tenant).filter(Tenant.slug == slug).first()

def get_tenants(db: Session, skip: int = 0, limit: int = 100) -> List[Tenant]:
    return db.query(Tenant).offset(skip).limit(limit).all()

def create_tenant(db: Session, tenant: TenantCreate) -> Tenant:
    db_tenant = Tenant(
        name=tenant.name,
        slug=tenant.slug,
        email=tenant.email,
        address=tenant.address,
        city=tenant.city,
        postal_code=tenant.postal_code,
        phone=tenant.phone,
        website=tenant.website,
        cif=tenant.cif,
        logo_url=tenant.logo_url
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant
