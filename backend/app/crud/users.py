from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

def get_user(db: Session, user_id: UUID) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_users_by_tenant(db: Session, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).filter(User.tenant_id == tenant_id).offset(skip).limit(limit).all()

def get_user_by_tenant(db: Session, user_id: UUID, tenant_id: UUID) -> Optional[User]:
    return db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()

def check_existing_user(db: Session, username: str, email: str) -> Optional[User]:
    return db.query(User).filter((User.username == username) | (User.email == email)).first()

def create_user(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user: User, update_data: dict) -> User:
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
