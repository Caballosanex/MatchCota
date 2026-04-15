"""
Schemas Pydantic per Leads.
"""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


LeadStatus = Literal["new", "contacted", "adopted", "rejected"]


class LeadCreate(BaseModel):
    """Schema per crear un lead públic."""

    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    questionnaire_responses: Optional[dict[str, Any]] = None
    top_matches: Optional[list[dict[str, Any]]] = None
    scores: Optional[dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_contact_medium(self):
        if not self.email and not self.phone:
            raise ValueError("At least one contact field is required: email or phone")
        return self


class LeadCreateReceipt(BaseModel):
    """Resposta mínima de creació de lead."""

    id: UUID
    created_at: datetime
    message: str


class LeadListItem(BaseModel):
    """Resposta resum per llistat admin de leads."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status: LeadStatus


class LeadDetail(BaseModel):
    """Resposta detallada per lead admin."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: LeadStatus
    questionnaire_responses: Optional[dict[str, Any]] = None
    top_matches: Optional[list[dict[str, Any]]] = None
    scores: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class LeadStatusUpdate(BaseModel):
    """Patch status-only per leads."""

    status: LeadStatus
