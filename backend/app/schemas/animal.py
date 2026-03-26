"""
Schemas Pydantic per Animals.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


class AnimalBase(BaseModel):
    """Camps base per animals."""
    name: str
    species: str
    breed: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[date] = None
    size: Optional[str] = None
    weight_kg: Optional[Decimal] = None
    microchip_number: Optional[str] = None
    description: Optional[str] = None
    medical_conditions: Optional[str] = None
    is_ppp: Optional[bool] = False

    # Matching characteristics (0-10 scale)
    energy_level: Optional[Decimal] = None
    sociability: Optional[Decimal] = None
    attention_needs: Optional[Decimal] = None
    good_with_children: Optional[Decimal] = None
    good_with_dogs: Optional[Decimal] = None
    good_with_cats: Optional[Decimal] = None
    experience_required: Optional[Decimal] = None
    maintenance_level: Optional[Decimal] = None


class AnimalCreate(AnimalBase):
    """Schema per crear un animal."""
    photo_urls: Optional[List[str]] = None


class AnimalUpdate(BaseModel):
    """Schema per actualitzar un animal (tots els camps opcionals per PATCH)."""
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[date] = None
    size: Optional[str] = None
    weight_kg: Optional[Decimal] = None
    microchip_number: Optional[str] = None
    description: Optional[str] = None
    medical_conditions: Optional[str] = None
    is_ppp: Optional[bool] = None
    energy_level: Optional[Decimal] = None
    sociability: Optional[Decimal] = None
    attention_needs: Optional[Decimal] = None
    good_with_children: Optional[Decimal] = None
    good_with_dogs: Optional[Decimal] = None
    good_with_cats: Optional[Decimal] = None
    experience_required: Optional[Decimal] = None
    maintenance_level: Optional[Decimal] = None
    photo_urls: Optional[List[str]] = None


class AnimalResponse(AnimalBase):
    """Schema de resposta amb tots els camps."""
    id: UUID
    tenant_id: UUID
    photo_urls: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
