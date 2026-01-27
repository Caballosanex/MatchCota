"""
Model Questionnaire (Qüestionari).
"""

from sqlalchemy import Column, JSON, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Questionnaire(Base):
    __tablename__ = "questionnaires"

    # Identificació
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), unique=True, nullable=False) # One per tenant usually

    # Contingut
    questions = Column(JSON) # preguntes
    answer_weights = Column(JSON) # pes (respostes)

    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacions
    tenant = relationship("Tenant", back_populates="questionnaire")

    def __repr__(self):
        return f"<Questionnaire {self.id}>"
