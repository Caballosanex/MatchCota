"""
Schemas Pydantic per Matching.
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import UUID


class QuestionOptionSchema(BaseModel):
    """Opcio de resposta."""
    value: str
    label: str
    weights: Optional[Dict[str, float]] = None


class QuestionSchema(BaseModel):
    """Pregunta del questionari."""
    id: str
    category: str
    text: str
    type: str
    options: List[QuestionOptionSchema]
    description: Optional[str] = None


class CategorySchema(BaseModel):
    """Categoria de preguntes."""
    id: str
    name: str


class QuestionnaireResponse(BaseModel):
    """Resposta amb el questionari complet."""
    questions: List[QuestionSchema]
    categories: List[CategorySchema]
    total_questions: int


class MatchRequest(BaseModel):
    """Request per calcular matches."""
    responses: Dict[str, Any]  # {question_id: answer_value}
    limit: int = 10


class AnimalMatchResult(BaseModel):
    """Resultat de match per un animal."""
    id: UUID
    name: str
    species: str
    breed: Optional[str] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    age_category: Optional[str] = None
    photo_url: Optional[str] = None
    description: Optional[str] = None
    
    # Matching
    score: float
    explanations: List[str]
    
    # Caracteristiques de matching (per debug/transparencia)
    matching_values: Optional[Dict[str, float]] = None

    class Config:
        from_attributes = True


class MatchResponse(BaseModel):
    """Resposta amb els resultats del matching."""
    matches: List[AnimalMatchResult]
    total_animals: int
    adopter_vector: List[float]
