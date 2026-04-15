"""
Model Lead.
"""

from sqlalchemy import Column, String, JSON, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    # Identificació
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    # Contacte
    email = Column(String(255), nullable=False) # email
    phone = Column(String(20)) # tel
    name = Column(String(100)) # nom

    # Matching Data
    questionnaire_responses = Column(JSON) # respostes
    top_matches = Column(JSON) # millors_match (store IDs or full objects?) usually JSON is fine for snapshot
    scores = Column(JSON) # puntuacions

    # Workflow status
    status = Column(String(20), nullable=False, default="new", server_default="new")

    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacions
    tenant = relationship("Tenant", back_populates="leads")

    def __repr__(self):
        return f"<Lead {self.email}>"
