"""
Model Tenant (Protectora).
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    # Identificació
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False) # nom_entitat

    # Contacte
    address = Column(String(500)) # direccio
    city = Column(String(100)) # Part of direccio usually but kept separate for structure if needed, or put everything in address. The prompt says "direcció: Inclou: adreça, ciutat, codi postal". I'll keep it as a single string for now or split it if I want more granularity. I'll make it a single string to match "direccio" more closely or keep separate fields as good practice. I'll use address, city, postal_code.
    postal_code = Column(String(20))
    phone = Column(String(20)) # tel
    email = Column(String(255)) # email
    website = Column(String(255)) # website

    # Legal
    cif = Column(String(20)) # CIF
    
    # Personalització
    logo_url = Column(String(500)) # logo_url
    
    # Configuració
    # payment_plan = Column(JSON) # pla pagament? (compte bancari, status) mes endavant. Ara no.
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow) # Data creament
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacions
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    animals = relationship("Animal", back_populates="tenant", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="tenant", cascade="all, delete-orphan")
    questionnaire = relationship("Questionnaire", back_populates="tenant", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant {self.slug}>"
