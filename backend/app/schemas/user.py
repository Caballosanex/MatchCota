"""
Schemas Pydantic per Users.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    """Camps base per users."""
    email: EmailStr
    username: str
    name: Optional[str] = None


class UserCreate(UserBase):
    """Schema per crear un user."""
    password: str  # Password en text pla, es farà hash al servidor


class UserUpdate(BaseModel):
    """Schema per actualitzar un user (tots els camps opcionals)."""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None  # Si es proporciona, es farà hash


class UserResponse(UserBase):
    """Schema de resposta (sense password)."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
