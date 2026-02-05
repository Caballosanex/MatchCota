from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.tenant import Tenant as TenantModel
from app.schemas.tenant import TenantCreate, Tenant
from app.core.tenant import get_current_tenant

router = APIRouter()


@router.get("/current", response_model=Tenant)
def get_current_tenant_info(tenant: TenantModel = Depends(get_current_tenant)):
    """
    Obtenir informació del tenant actual (públic).

    Usat pel frontend per mostrar logo, nom, etc. de la protectora.
    El tenant es determina pel header X-Tenant-Slug o subdomini.
    """
    return tenant


@router.post("/", response_model=Tenant, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a new tenant (Protectora).
    """
    # 1. Check if slug exists
    if db.query(TenantModel).filter(TenantModel.slug == tenant_in.slug).first():
        raise HTTPException(
            status_code=400,
            detail="A tenant with this slug already exists."
        )
    
    # 2. Check if email exists (optional constraint, but good practice)
    # The model doesn't enforce unique email globally for Tenants, but maybe we should warn?
    # For now, we trust the model constraints.

    # 3. Create Tenant
    db_tenant = TenantModel(
        name=tenant_in.name,
        slug=tenant_in.slug,
        email=tenant_in.email,
        address=tenant_in.address,
        city=tenant_in.city,
        postal_code=tenant_in.postal_code,
        phone=tenant_in.phone,
        website=tenant_in.website,
        cif=tenant_in.cif,
        logo_url=tenant_in.logo_url
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant
