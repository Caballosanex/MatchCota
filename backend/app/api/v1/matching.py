"""
Endpoints per Matching.

Endpoints publics per obtenir el questionari i calcular matches.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models.animal import Animal
from app.models.tenant import Tenant
from app.schemas.matching import (
    QuestionnaireResponse,
    QuestionSchema,
    CategorySchema,
    MatchRequest,
    MatchResponse,
    AnimalMatchResult,
)
from app.core.tenant import get_current_tenant
from app.matching.questionnaire import (
    get_questionnaire,
    get_question_weights,
    get_categories,
)
from app.matching.engine import (
    responses_to_vector,
    calculate_matches,
    MATCHING_DIMENSIONS,
)


router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/questionnaire", response_model=QuestionnaireResponse)
def get_matching_questionnaire(
    tenant: Tenant = Depends(get_current_tenant),
):
    """
    Obtenir el questionari de matching.
    
    Retorna totes les preguntes amb les seves opcions,
    agrupades per categories.
    """
    questions = get_questionnaire()
    categories = get_categories()
    
    return QuestionnaireResponse(
        questions=[QuestionSchema(**q) for q in questions],
        categories=[CategorySchema(**c) for c in categories],
        total_questions=len(questions),
    )


@router.post("/calculate", response_model=MatchResponse)
def calculate_matching(
    request: MatchRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Calcular matches basats en les respostes del questionari.
    
    Processa les respostes, genera el vector de l'adoptant,
    i compara amb tots els animals disponibles del tenant.
    """
    # Obtenir pesos del questionari
    weights = get_question_weights()
    
    # Convertir respostes a vector
    adopter_vector = responses_to_vector(request.responses, weights)
    
    # Obtenir tots els animals del tenant
    all_animals = db.query(Animal).filter(
        Animal.tenant_id == tenant.id
    ).all()
    
    total_animals = len(all_animals)
    
    # Calcular matches
    match_results = calculate_matches(
        adopter_vector=adopter_vector,
        animals=all_animals,
        limit=request.limit,
    )
    
    # Convertir resultats a schema de resposta
    matches = []
    for result in match_results:
        animal = result["animal"]
        
        # Calcular categoria d'edat (per mostrar a la UI)
        age_category = None
        if animal.birth_date:
            age_years = (date.today() - animal.birth_date).days / 365.25
            if age_years < 1:
                age_category = "puppy"
            elif age_years < 3:
                age_category = "young"
            elif age_years < 8:
                age_category = "adult"
            else:
                age_category = "senior"
        
        # Primera foto o None
        photo_url = animal.photo_urls[0] if animal.photo_urls else None
        
        # Valors de matching per transparencia
        matching_values = {}
        for dim in MATCHING_DIMENSIONS:
            val = getattr(animal, dim, None)
            if val is not None:
                matching_values[dim] = float(val)
        
        matches.append(AnimalMatchResult(
            id=animal.id,
            name=animal.name,
            species=animal.species,
            breed=animal.breed,
            sex=animal.sex,
            size=animal.size,
            age_category=age_category,
            photo_url=photo_url,
            description=animal.description,
            score=result["score"],
            explanations=result["explanations"],
            matching_values=matching_values,
        ))
    
    return MatchResponse(
        matches=matches,
        total_animals=total_animals,
        adopter_vector=adopter_vector.tolist(),
    )
