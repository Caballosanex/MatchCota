from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from typing import List, Optional

from app.crud import animals as crud_animals
from app.schemas.animal import AnimalCreate, AnimalUpdate, AnimalResponse
from app.models.animal import Animal

def list_animals(
    db: Session,
    tenant_id: UUID,
    skip: int = 0,
    limit: int = 100,
    species: Optional[str] = None,
    size: Optional[str] = None,
    sex: Optional[str] = None,
) -> List[Animal]:
    return crud_animals.get_animals_by_tenant(db, tenant_id, skip, limit, species, size, sex)

def get_animal(db: Session, animal_id: UUID, tenant_id: UUID) -> Animal:
    animal = crud_animals.get_animal_by_tenant(db, animal_id, tenant_id)
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )
    return animal

def create_animal(db: Session, animal_data: AnimalCreate, tenant_id: UUID) -> Animal:
    # Prepare model
    animal = Animal(
        tenant_id=tenant_id,
        **animal_data.model_dump()
    )
    
    return crud_animals.create_animal(db, animal)

def update_animal(db: Session, animal_id: UUID, animal_data: AnimalUpdate, tenant_id: UUID) -> Animal:
    animal = get_animal(db, animal_id, tenant_id) # Validates existence and tenant

    update_data_dict = animal_data.model_dump(exclude_unset=True)

    return crud_animals.update_animal(db, animal, update_data_dict)

def delete_animal(db: Session, animal_id: UUID, tenant_id: UUID) -> None:
    animal = get_animal(db, animal_id, tenant_id) # Validates existence and tenant
    
    crud_animals.delete_animal(db, animal)
