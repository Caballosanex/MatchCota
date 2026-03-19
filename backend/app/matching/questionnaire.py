"""
Definicio del Questionari de Matching.

Cada pregunta acumula pesos sobre les 8 dimensions del vector de l'adoptant.
Les dimensions corresponen als camps de matching dels animals.

Mida i edat son FILTRES PREVIS (no dimensions del vector).
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class QuestionType(str, Enum):
    """Tipus de pregunta."""
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"


class QuestionOption(BaseModel):
    """Opcio de resposta amb pesos opcionals."""
    value: str
    label: str
    weights: Optional[Dict[str, float]] = None  # {dimension: weight}


class Question(BaseModel):
    """Definicio d'una pregunta del questionari."""
    id: str
    category: str
    text: str
    type: QuestionType
    options: List[QuestionOption]
    description: Optional[str] = None
    is_filter: bool = False  # Si es True, no afecta el vector, es un filtre previ


# ============================================================================
# DEFINICIO DEL QUESTIONARI
# ============================================================================
# Pesos en escala 0-10 (es normalitzaran a -1/1 internament)
# ============================================================================

QUESTIONNAIRE: List[Question] = [
    # === CATEGORIA: HABITATGE ===
    Question(
        id="housing_type",
        category="housing",
        text="Quin tipus d'habitatge tens?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="apartment_small", label="Pis petit (menys de 60m2)", weights={"energy_level": 2.0}),
            QuestionOption(value="apartment_large", label="Pis gran (mes de 60m2)", weights={"energy_level": 5.0}),
            QuestionOption(value="house_no_garden", label="Casa sense jardi", weights={"energy_level": 6.0}),
            QuestionOption(value="house_garden", label="Casa amb jardi", weights={"energy_level": 9.0}),
        ]
    ),

    Question(
        id="outdoor_access",
        category="housing",
        text="Tens acces a espais a l'aire lliure propers?",
        description="Parcs, zones verdes, arees per passejar",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No, visc en zona molt urbana", weights={"energy_level": 1.0}),
            QuestionOption(value="limited", label="Si, pero limitats", weights={"energy_level": 4.0}),
            QuestionOption(value="good", label="Si, bastants a prop", weights={"energy_level": 7.0}),
            QuestionOption(value="excellent", label="Si, molts i amplis", weights={"energy_level": 9.0}),
        ]
    ),

    # === CATEGORIA: TEMPS I DEDICACIO ===
    Question(
        id="hours_alone",
        category="time",
        text="Quantes hores al dia estara sol l'animal?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="few", label="Menys de 4 hores", weights={"attention_needs": 9.0}),
            QuestionOption(value="half_day", label="4 - 6 hores", weights={"attention_needs": 6.0}),
            QuestionOption(value="work_day", label="6 - 8 hores", weights={"attention_needs": 3.0}),
            QuestionOption(value="long", label="Mes de 8 hores", weights={"attention_needs": 1.0}),
        ]
    ),

    Question(
        id="exercise_time",
        category="time",
        text="Quant de temps pots dedicar a passejar/jugar cada dia?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="minimal", label="Menys de 30 minuts", weights={"energy_level": 2.0}),
            QuestionOption(value="moderate", label="30 min - 1 hora", weights={"energy_level": 5.0}),
            QuestionOption(value="good", label="1 - 2 hores", weights={"energy_level": 7.0}),
            QuestionOption(value="high", label="Mes de 2 hores", weights={"energy_level": 10.0}),
        ]
    ),

    # === CATEGORIA: COMPOSICIO FAMILIAR ===
    Question(
        id="children",
        category="family",
        text="Hi ha nens a casa?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No", weights={"good_with_children": 0.0}),
            QuestionOption(value="older", label="Si, majors de 10 anys", weights={"good_with_children": 5.0}),
            QuestionOption(value="young", label="Si, entre 5 i 10 anys", weights={"good_with_children": 8.0}),
            QuestionOption(value="toddler", label="Si, menors de 5 anys", weights={"good_with_children": 10.0}),
        ]
    ),

    Question(
        id="other_pets",
        category="family",
        text="Tens altres animals a casa?",
        type=QuestionType.MULTIPLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No", weights={"good_with_dogs": 0.0, "good_with_cats": 0.0}),
            QuestionOption(value="dog", label="Gos/s", weights={"good_with_dogs": 10.0}),
            QuestionOption(value="cat", label="Gat/s", weights={"good_with_cats": 10.0}),
        ]
    ),

    # === CATEGORIA: EXPERIENCIA ===
    Question(
        id="experience_level",
        category="experience",
        text="Quina experiencia tens amb animals?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="Cap, seria el meu primer", weights={"experience_required": 1.0}),
            QuestionOption(value="some", label="He tingut animals pero fa temps", weights={"experience_required": 4.0}),
            QuestionOption(value="current", label="Tinc o he tingut recentment", weights={"experience_required": 7.0}),
            QuestionOption(value="expert", label="Molta experiencia, incloent casos dificils", weights={"experience_required": 10.0}),
        ]
    ),

    # === CATEGORIA: PREFERENCIES ===
    Question(
        id="energy_preference",
        category="preferences",
        text="Quin nivell d'energia busques?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="calm", label="Tranquil, per fer companyia", weights={"energy_level": 2.0}),
            QuestionOption(value="moderate", label="Moderat, equilibrat", weights={"energy_level": 5.0}),
            QuestionOption(value="active", label="Actiu, per fer activitats", weights={"energy_level": 7.0}),
            QuestionOption(value="very_active", label="Molt actiu, esportista", weights={"energy_level": 10.0}),
        ]
    ),

    Question(
        id="sociability_preference",
        category="preferences",
        text="Quin caracter prefereixes?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="independent", label="Independent, que vagi a la seva", weights={"sociability": 2.0}),
            QuestionOption(value="balanced", label="Equilibrat", weights={"sociability": 5.0}),
            QuestionOption(value="affectionate", label="Afectuos i sociable", weights={"sociability": 8.0}),
            QuestionOption(value="very_social", label="Molt sociable, sempre a prop", weights={"sociability": 10.0}),
        ]
    ),

    # === NOVA PREGUNTA: MANTENIMENT ===
    Question(
        id="maintenance_capacity",
        category="preferences",
        text="Mes enlla de l'afecte i els passejos, algunes mascotes requereixen rutines de cures mes exigents (dietes especifiques, perruqueria frequent, revisions periodiques). Com encaixaria aixo en la teva planificacio?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="low", label="Prefereixo rutines practiques i senzilles", weights={"maintenance_level": 2.0}),
            QuestionOption(value="medium", label="Puc gestionar cures puntuals sense problema", weights={"maintenance_level": 5.0}),
            QuestionOption(value="high", label="Estic preparat per rutines exigents o tractaments", weights={"maintenance_level": 9.0}),
        ]
    ),
]


def get_questionnaire() -> List[Dict[str, Any]]:
    """
    Retorna el questionari en format JSON-serialitzable.
    """
    return [q.model_dump() for q in QUESTIONNAIRE]


def get_question_weights() -> Dict[str, Dict[str, Dict[str, float]]]:
    """
    Retorna un diccionari amb els pesos de cada resposta.
    
    Format: {question_id: {answer_value: {dimension: weight}}}
    """
    weights = {}
    for question in QUESTIONNAIRE:
        if question.is_filter:
            continue
        
        question_weights = {}
        for option in question.options:
            if option.weights:
                question_weights[option.value] = option.weights
        
        if question_weights:
            weights[question.id] = question_weights
    
    return weights


def get_categories() -> List[Dict[str, str]]:
    """
    Retorna les categories del questionari.
    """
    categories = {
        "housing": "Habitatge",
        "time": "Temps i dedicacio",
        "family": "Composicio familiar",
        "experience": "Experiencia",
        "preferences": "Preferencies",
    }
    
    seen = set()
    result = []
    for q in QUESTIONNAIRE:
        if q.category not in seen:
            seen.add(q.category)
            result.append({
                "id": q.category,
                "name": categories.get(q.category, q.category),
            })
    
    return result
