"""
Endpoints CRUD per Animals.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.animal import Animal
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.animal import AnimalCreate, AnimalUpdate, AnimalResponse
from app.core.tenant import get_current_tenant
from app.api.v1.auth import get_current_user


router = APIRouter(tags=["animals"])


# ============================================
# ENDPOINTS PÚBLICS
# ============================================

@router.get("/animals", response_model=List[AnimalResponse])
def list_animals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    species: Optional[str] = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Llistar animals disponibles del tenant actual.

    Filtres:
    - species: Filtrar per espècie (dog, cat, etc.)
    - skip/limit: Paginació
    """
    query = db.query(Animal).filter(Animal.tenant_id == tenant.id)

    if species:
        query = query.filter(Animal.species == species)

    animals = query.offset(skip).limit(limit).all()
    return animals


@router.get("/animals/{animal_id}", response_model=AnimalResponse)
def get_animal(
    animal_id: UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Obtenir detall d'un animal."""
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.tenant_id == tenant.id  # CRÍTIC: filtrar per tenant
    ).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )

    return animal


# ============================================
# ENDPOINTS ADMIN (protegits amb auth)
# ============================================

@router.post("/admin/animals", response_model=AnimalResponse, status_code=status.HTTP_201_CREATED)
def create_animal(
    animal_data: AnimalCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Crear un nou animal (només admin).

    L'animal es crea automàticament dins del tenant de l'usuari actual.
    """
    animal = Animal(
        tenant_id=tenant.id,  # Assignar automàticament tenant
        **animal_data.model_dump()
    )
    db.add(animal)
    db.commit()
    db.refresh(animal)

    return animal


@router.put("/admin/animals/{animal_id}", response_model=AnimalResponse)
def update_animal(
    animal_id: UUID,
    animal_data: AnimalUpdate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Actualitzar un animal (només admin del mateix tenant)."""
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.tenant_id == tenant.id  # CRÍTIC: només animals del propi tenant
    ).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )

    # Actualitzar només camps proporcionats
    update_data = animal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(animal, field, value)

    db.commit()
    db.refresh(animal)

    return animal


@router.delete("/admin/animals/{animal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_animal(
    animal_id: UUID,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Esborrar un animal (només admin del mateix tenant)."""
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.tenant_id == tenant.id
    ).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )

    db.delete(animal)
    db.commit()

    return None
