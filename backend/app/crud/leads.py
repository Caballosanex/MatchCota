from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.lead import Lead

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
) -> List[Lead]:
    query = db.query(Lead).filter(Lead.tenant_id == tenant_id)

    if status:
        query = query.filter(Lead.status == status)

    return query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()


def get_lead_by_tenant(db: Session, lead_id: UUID, tenant_id: UUID) -> Optional[Lead]:
    return db.query(Lead).filter(Lead.id == lead_id, Lead.tenant_id == tenant_id).first()


def update_lead(db: Session, lead: Lead, update_data: dict) -> Lead:
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead
