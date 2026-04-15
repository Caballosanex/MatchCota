"""Lead endpoints for public creation and admin management."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.core.tenant import get_current_tenant
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.lead import (
    LeadCreate,
    LeadCreateReceipt,
    LeadDetail,
    LeadListItem,
    LeadStatus,
    LeadStatusUpdate,
)
from app.services import leads as leads_service


router = APIRouter(tags=["leads"])


@router.post("/leads", response_model=LeadCreateReceipt, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_data: LeadCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    lead = leads_service.create_lead(db, lead_data, tenant.id)
    return {
        "id": lead.id,
        "created_at": lead.created_at,
        "message": "Lead submitted successfully",
    }


@router.get("/admin/leads", response_model=List[LeadListItem])
def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[LeadStatus] = Query(None),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    _ = current_user
    return leads_service.list_leads(
        db,
        tenant_id=tenant.id,
        skip=skip,
        limit=limit,
        lead_status=status,
    )


@router.get("/admin/leads/{lead_id}", response_model=LeadDetail)
def get_lead(
    lead_id: UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    _ = current_user
    return leads_service.get_lead(db, lead_id, tenant.id)


@router.patch("/admin/leads/{lead_id}", response_model=LeadDetail)
def update_lead_status(
    lead_id: UUID,
    status_data: LeadStatusUpdate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    _ = current_user
    return leads_service.update_lead_status(db, lead_id, status_data, tenant.id)
