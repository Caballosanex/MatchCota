from typing import Optional
from pydantic import BaseModel, EmailStr, HttpUrl
from uuid import UUID
from datetime import datetime

class TenantBase(BaseModel):
    name: str
    slug: str
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: EmailStr
    website: Optional[str] = None
    cif: Optional[str] = None
    logo_url: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantUpdate(TenantBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    email: Optional[EmailStr] = None

class Tenant(TenantBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
