from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.models.animal import Animal
from app.schemas.animal import AnimalCreate, AnimalUpdate

def get_animal(db: Session, animal_id: UUID) -> Optional[Animal]:
    return db.query(Animal).filter(Animal.id == animal_id).first()

def get_animals_by_tenant(
    db: Session, 
    tenant_id: UUID, 
    skip: int = 0, 
    limit: int = 100, 
    species: Optional[str] = None
) -> List[Animal]:
    query = db.query(Animal).filter(Animal.tenant_id == tenant_id)
    
    if species:
        query = query.filter(Animal.species == species)
        
    return query.offset(skip).limit(limit).all()

def get_animal_by_tenant(db: Session, animal_id: UUID, tenant_id: UUID) -> Optional[Animal]:
    return db.query(Animal).filter(Animal.id == animal_id, Animal.tenant_id == tenant_id).first()

def create_animal(db: Session, animal: Animal) -> Animal:
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return animal

def update_animal(db: Session, animal: Animal, update_data: dict) -> Animal:
    for field, value in update_data.items():
        setattr(animal, field, value)
    db.commit()
    db.refresh(animal)
    return animal

def delete_animal(db: Session, animal: Animal) -> None:
    db.delete(animal)
    db.commit()
