from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

from app.crud import users as crud_users
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.models.user import User
from app.core.security import get_password_hash

def list_users(db: Session, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[User]:
    return crud_users.get_users_by_tenant(db, tenant_id, skip, limit)

def get_user(db: Session, user_id: UUID, tenant_id: UUID) -> User:
    user = crud_users.get_user_by_tenant(db, user_id, tenant_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User no trobat"
        )
    return user

def create_user(db: Session, user_data: UserCreate, tenant_id: UUID) -> User:
    # Verify existing
    if crud_users.check_existing_user(db, user_data.username, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username o email ja existeix"
        )

    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Prepare model
    user = User(
        tenant_id=tenant_id,
        username=user_data.username,
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password
    )
    
    return crud_users.create_user(db, user)

def update_user(db: Session, user_id: UUID, user_data: UserUpdate, tenant_id: UUID) -> User:
    user = get_user(db, user_id, tenant_id) # Validates existence and tenant

    update_data_dict = user_data.model_dump(exclude_unset=True)
    
    if "password" in update_data_dict and update_data_dict["password"]:
        update_data_dict["password_hash"] = get_password_hash(update_data_dict.pop("password"))

    return crud_users.update_user(db, user, update_data_dict)

def delete_user(db: Session, user_id: UUID, current_user_id: UUID, tenant_id: UUID) -> None:
    user = get_user(db, user_id, tenant_id) # Validates existence and tenant

    # Prevent self-deletion
    if user.id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pots esborrar el teu propi usuari"
        )
    
    crud_users.delete_user(db, user)
