from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List

from app.database import get_db
from app.config import settings
from app.models.tenant import Tenant as TenantModel
from app.schemas.tenant import TenantCreate, Tenant
from app.core.tenant import get_current_tenant
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
