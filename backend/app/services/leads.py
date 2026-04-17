from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud import leads as crud_leads
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadStatusUpdate


def _normalize_top_match_snapshot(raw_match: dict[str, Any]) -> dict[str, Any]:
    return {
        "animal_id": raw_match.get("animal_id"),
        "animal_name": raw_match.get("animal_name"),
        "species": raw_match.get("species"),
        "breed": raw_match.get("breed"),
        "score": raw_match.get("score"),
        "explanations": raw_match.get("explanations") or [],
    }


def _normalize_top_matches(top_matches: Optional[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    if not top_matches:
        return []

    return [_normalize_top_match_snapshot(item) for item in top_matches]


def create_lead(db: Session, lead_data: LeadCreate, tenant_id: UUID) -> Lead:
    lead = Lead(
        tenant_id=tenant_id,
        name=lead_data.name,
        email=lead_data.email,
        phone=lead_data.phone,
        questionnaire_responses=lead_data.questionnaire_responses,
        top_matches=_normalize_top_matches(lead_data.top_matches),
        scores=lead_data.scores,
    )

    return crud_leads.create_lead(db, lead)


def list_leads(
    db: Session,
    tenant_id: UUID,
    skip: int = 0,
    limit: int = 50,
    lead_status: Optional[str] = None,
) -> list[Lead]:
    return crud_leads.get_leads_by_tenant(
        db,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
        status=lead_status,
    )


def get_lead(db: Session, lead_id: UUID, tenant_id: UUID) -> Lead:
    lead = crud_leads.get_lead_by_tenant(db, lead_id, tenant_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead no trobat")
    return lead


def update_lead_status(db: Session, lead_id: UUID, status_update: LeadStatusUpdate, tenant_id: UUID) -> Lead:
    lead = crud_leads.get_lead_by_tenant(db, lead_id, tenant_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead no trobat")

    return crud_leads.update_lead(db, lead, {"status": status_update.status})
