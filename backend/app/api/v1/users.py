"""
Endpoints CRUD per Users (empleats de protectores).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.tenant import get_current_tenant
from app.api.v1.auth import get_current_user
from app.services import users as users_service

router = APIRouter(prefix="/admin/users", tags=["users"])


# ============================================
# ENDPOINTS ADMIN (tots protegits amb auth)
# ============================================

@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Llistar users del tenant actual (només admin).

    Paginació amb skip/limit.
    """
    return users_service.list_users(db, tenant.id, skip, limit)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Obtenir detall d'un user."""
    return users_service.get_user(db, user_id, tenant.id)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Crear un nou user (només admin).

    El user es crea automàticament dins del tenant de l'usuari actual.
    La password es guarda hashejada.
    """
    return users_service.create_user(db, user_data, tenant.id)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Actualitzar un user (només admin del mateix tenant)."""
    return users_service.update_user(db, user_id, user_data, tenant.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Esborrar un user (només admin del mateix tenant)."""
    return users_service.delete_user(db, user_id, current_user.id, tenant.id)

