from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.models.lead import Lead


def _is_missing_status_column_error(exc: ProgrammingError) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    return "column leads.status does not exist" in message or "undefinedcolumn" in message


def _row_to_lead_payload(row: Any) -> dict[str, Any]:
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "questionnaire_responses": row.questionnaire_responses,
        "top_matches": row.top_matches,
        "scores": row.scores,
        "status": "new",
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def create_lead(db: Session, lead: Lead) -> Lead:
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_leads_by_tenant(
    db: Session,
    tenant_id: UUID,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
) -> List[Lead] | List[dict[str, Any]]:
    query = db.query(Lead).filter(Lead.tenant_id == tenant_id)

    if status:
        query = query.filter(Lead.status == status)

    try:
        return query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    except ProgrammingError as exc:
        if not _is_missing_status_column_error(exc):
            raise

        # Backward-compatible fallback for runtimes where alembic revision
        # 05_lead_status_contract has not yet been applied.
        if status and status != "new":
            return []

        legacy_rows = (
            db.query(
                Lead.id,
                Lead.tenant_id,
                Lead.name,
                Lead.email,
                Lead.phone,
                Lead.questionnaire_responses,
                Lead.top_matches,
                Lead.scores,
                Lead.created_at,
                Lead.updated_at,
            )
            .filter(Lead.tenant_id == tenant_id)
            .order_by(Lead.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [_row_to_lead_payload(row) for row in legacy_rows]


def get_lead_by_tenant(db: Session, lead_id: UUID, tenant_id: UUID) -> Optional[Lead] | Optional[dict[str, Any]]:
    try:
        return db.query(Lead).filter(Lead.id == lead_id, Lead.tenant_id == tenant_id).first()
    except ProgrammingError as exc:
        if not _is_missing_status_column_error(exc):
            raise

        row = (
            db.query(
                Lead.id,
                Lead.tenant_id,
                Lead.name,
                Lead.email,
                Lead.phone,
                Lead.questionnaire_responses,
                Lead.top_matches,
                Lead.scores,
                Lead.created_at,
                Lead.updated_at,
            )
            .filter(Lead.id == lead_id, Lead.tenant_id == tenant_id)
            .first()
        )
        if not row:
            return None
        return _row_to_lead_payload(row)


def update_lead(db: Session, lead: Lead, update_data: dict) -> Lead:
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead
