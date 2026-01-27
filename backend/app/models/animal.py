"""
Model Animal.
"""

from sqlalchemy import Column, String, Integer, Boolean, Date, Text, Numeric, ARRAY, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Animal(Base):
    __tablename__ = "animals"

    # Identificació
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    # Camps principals
    name = Column(String(100), nullable=False) # nom
    birth_date = Column(Date) # data neix o anys
    size = Column(String(50)) # mida / pes (part 1)
    weight_kg = Column(Numeric(5, 2)) # mida / pes (part 2)
    microchip_number = Column(String(100)) # Nº de microxip
    species = Column(String(50), nullable=False) # Espècie
    breed = Column(String(100)) # Raça
    sex = Column(String(20)) # Sexe (Mach / Femella)
    
    # Flags i comportament
    is_ppp = Column(Boolean, default=False) # PPP
    attention_needs = Column(Numeric(3, 1)) # Necessitat d'atenció (context: independència) - 0.0 to 10.0 or 0.0 to 1.0
    sociability = Column(Numeric(3, 1)) # Sociabilitat
    energy_level = Column(Numeric(3, 1)) # Nivell d'energia
    
    # Descripcions
    description = Column(Text) # Descripció
    medical_conditions = Column(Text) # Condicions mèdiques

    # Media
    photo_urls = Column(ARRAY(String)) # foto_url (TEXT[])

    # Calculated matching features (cached or computed)
    # bo-nens, bo-gossos, bo-gats, exp-necessària
    good_with_children = Column(Numeric(3, 1)) # bo-nens
    good_with_dogs = Column(Numeric(3, 1)) # bo-gossos
    good_with_cats = Column(Numeric(3, 1)) # bo-gats
    experience_required = Column(Numeric(3, 1)) # exp-necessària (linked to others)

    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacions
    tenant = relationship("Tenant", back_populates="animals")

    def __repr__(self):
        return f"<Animal {self.name}>"
