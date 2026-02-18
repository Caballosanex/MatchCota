from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.tenant import Tenant as TenantModel
from app.schemas.tenant import TenantCreate, Tenant
from app.core.tenant import get_current_tenant
from app.services import tenants as tenants_service

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
    return tenants_service.create_tenant(db, tenant_in)
