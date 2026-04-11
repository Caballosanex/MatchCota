from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field
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
    admin_password: str = Field(min_length=8)

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


class OnboardingHandoffCheck(BaseModel):
    stage: Literal["preboot", "current", "login"]
    status: Literal["ok", "unresolved"]


class OnboardingFallbackActions(BaseModel):
    retry: bool = True
    open: bool = True
    copy: bool = True


class OnboardingHandoffStatus(BaseModel):
    registration_outcome: Literal["success"] = "success"
    handoff_status: Literal["ready", "action_required"]
    checks: list[OnboardingHandoffCheck]
    fallback_actions: OnboardingFallbackActions
    user_message_key: str
    support_code: str = Field(
        pattern=r"^(CREATE|CONTEXT|LOGIN)-[A-Z0-9_]+$"
    )


class TenantRegistrationResponse(Tenant):
    onboarding: OnboardingHandoffStatus


class TenantIsolationDenyStatus(BaseModel):
    registration_outcome: Literal["denied"] = "denied"
    handoff_status: Literal["tenant_mismatch"] = "tenant_mismatch"
    user_message_key: str
    support_code: str = Field(pattern=r"^LOGIN-[A-Z0-9_]+$")
