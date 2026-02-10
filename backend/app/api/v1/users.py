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
from app.core.security import get_password_hash
from app.api.v1.auth import get_current_user


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
    users = db.query(User).filter(
        User.tenant_id == tenant.id
    ).offset(skip).limit(limit).all()

    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Obtenir detall d'un user."""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id  # CRÍTIC: filtrar per tenant
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User no trobat"
        )

    return user


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
    # Verificar que username i email no existeixen
    existing = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username o email ja existeix"
        )

    # Crear user amb password hashejada
    user = User(
        tenant_id=tenant.id,
        username=user_data.username,
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Actualitzar un user (només admin del mateix tenant)."""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id  # CRÍTIC: només users del propi tenant
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User no trobat"
        )

    # Actualitzar camps
    update_data = user_data.model_dump(exclude_unset=True)

    # Si hi ha password, fer hash
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Esborrar un user (només admin del mateix tenant)."""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User no trobat"
        )

    # No permetre esborrar-se a un mateix
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pots esborrar el teu propi usuari"
        )

    db.delete(user)
    db.commit()

    return None
