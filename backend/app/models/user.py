"""
Model User (Empleats).
"""

from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class User(Base):
    __tablename__ = "users"

    # Identificació
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Auth fields
    user_id = Column(String(255)) # usuari_id
    username = Column(String(100), unique=True, nullable=False) # nom_usuari
    email = Column(String(255), nullable=False) # email
    password_hash = Column(String(255), nullable=False) # contrasenya
    
    # Profile
    name = Column(String(100)) # nom

    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacions
    tenant = relationship("Tenant", back_populates="users")

    def __repr__(self):
        return f"<User {self.email}>"
