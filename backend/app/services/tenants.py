from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID

from app.crud import tenants as crud_tenants
from app.schemas.tenant import TenantCreate, Tenant
from app.models.tenant import Tenant as TenantModel

def create_tenant(db: Session, tenant_in: TenantCreate) -> TenantModel:
    """
    Creates a new tenant after validating that the slug is unique.
    """
    # 1. Check if slug exists
    if crud_tenants.get_tenant_by_slug(db, slug=tenant_in.slug):
        raise HTTPException(
            status_code=400,
            detail="A tenant with this slug already exists."
        )
    
    # 2. Check email or other business logic here if needed
    
    # 3. Create Tenant via CRUD
    return crud_tenants.create_tenant(db, tenant=tenant_in)

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
