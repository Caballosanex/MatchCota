"""
Motor de Matching - Similitud del Cosinus.

Sistema purament matematic sense ML/LLM/OCR.
Compara vectors de 8 dimensions entre adoptants i animals.
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
import numpy as np

from app.models.animal import Animal


# Les 8 dimensions del vector de matching (ordre important!)
MATCHING_DIMENSIONS = [
    "energy_level",        # Nivell d'energia
    "attention_needs",     # Necessitat d'atencio (independencia)
    "sociability",         # Sociabilitat
    "good_with_children",  # Bo amb nens
    "good_with_dogs",      # Bo amb gossos
    "good_with_cats",      # Bo amb gats
    "experience_required", # Experiencia necessaria
    "maintenance_level",   # Nivell de manteniment
]


def normalize_value(value: Optional[Decimal], scale_min: float = 0.0, scale_max: float = 10.0) -> float:
    """
    Normalitza un valor de l'escala 0-10 a l'escala -1.0 a 1.0.
    
    Args:
        value: Valor decimal (pot ser None)
        scale_min: Minim de l'escala original (default 0)
        scale_max: Maxim de l'escala original (default 10)
    
    Returns:
        Valor normalitzat entre -1.0 i 1.0, o 0.0 si es None
    """
    if value is None:
        return 0.0
    
    v = float(value)
    # Normalitzar de [0, 10] a [-1, 1]
    normalized = (2 * (v - scale_min) / (scale_max - scale_min)) - 1
    return max(-1.0, min(1.0, normalized))


def animal_to_vector(animal: Animal) -> np.ndarray:
    """
    Converteix un animal a un vector de 8 dimensions normalitzat.
    
    Args:
        animal: Model Animal de SQLAlchemy
    
    Returns:
        numpy array de 8 dimensions amb valors entre -1.0 i 1.0
    """
    vector = []
    for dim in MATCHING_DIMENSIONS:
        value = getattr(animal, dim, None)
        vector.append(normalize_value(value))
    
    return np.array(vector, dtype=np.float64)


def responses_to_vector(responses: Dict[str, Any], weights: Dict[str, Dict[str, float]]) -> np.ndarray:
    """
    Converteix les respostes del questionari a un vector de 8 dimensions.
    
    Les respostes acumulen pesos sobre les dimensions. Cada pregunta pot
    afectar una o mes dimensions amb pesos especifics.
    
    Args:
        responses: Dict amb {question_id: answer_value}
        weights: Dict amb {question_id: {answer_value: {dimension: weight}}}
    
    Returns:
        numpy array de 8 dimensions normalitzat
    """
    # Inicialitzar acumuladors per cada dimensio
    dimension_sums = {dim: 0.0 for dim in MATCHING_DIMENSIONS}
    dimension_counts = {dim: 0 for dim in MATCHING_DIMENSIONS}
    
    for question_id, answer_value in responses.items():
        if question_id not in weights:
            continue
        
        question_weights = weights[question_id]
        
        # Suportar tant single choice com multiple choice
        if isinstance(answer_value, list):
            # Multiple choice: acumular tots els pesos
            for single_answer in answer_value:
                if single_answer in question_weights:
                    for dim, weight in question_weights[single_answer].items():
                        if dim in dimension_sums:
                            dimension_sums[dim] += weight
                            dimension_counts[dim] += 1
        else:
            # Single choice
            if answer_value in question_weights:
                for dim, weight in question_weights[answer_value].items():
                    if dim in dimension_sums:
                        dimension_sums[dim] += weight
                        dimension_counts[dim] += 1
    
    # Calcular mitjana per cada dimensio i normalitzar a [-1, 1]
    vector = []
    for dim in MATCHING_DIMENSIONS:
        if dimension_counts[dim] > 0:
            # Mitjana dels pesos acumulats
            avg = dimension_sums[dim] / dimension_counts[dim]
            # Els pesos ja estan en escala aproximada 0-10, normalitzem
            normalized = normalize_value(Decimal(str(avg)))
        else:
            normalized = 0.0
        vector.append(normalized)
    
    return np.array(vector, dtype=np.float64)


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Calcula la similitud del cosinus entre dos vectors.
    
    Args:
        vec_a: Primer vector (numpy array)
        vec_b: Segon vector (numpy array)
    
    Returns:
        Valor entre -1.0 i 1.0
    """
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    
    # Evitar divisio per zero
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


def calculate_compatibility_score(adopter_vector: np.ndarray, animal_vector: np.ndarray) -> float:
    """
    Calcula el score de compatibilitat entre adoptant i animal.
    
    Args:
        adopter_vector: Vector de l'adoptant (8 dimensions)
        animal_vector: Vector de l'animal (8 dimensions)
    
    Returns:
        Score entre 0 i 100
    """
    similarity = cosine_similarity(adopter_vector, animal_vector)
    
    # Convertir de [-1, 1] a [0, 100]
    score = (similarity + 1) * 50
    
    return round(score, 1)


def calculate_matches(
    adopter_vector: np.ndarray,
    animals: List[Animal],
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Calcula els millors matches per a un adoptant.
    
    Args:
        adopter_vector: Vector de l'adoptant (8 dimensions)
        animals: Llista d'animals disponibles
        limit: Nombre maxim de resultats (default 10)
    
    Returns:
        Llista de dicts amb {animal, score, animal_vector, explanations}
    """
    results = []
    
    for animal in animals:
        # Calcular vector i score
        animal_vector = animal_to_vector(animal)
        score = calculate_compatibility_score(adopter_vector, animal_vector)
        
        # Generar explicacions
        explanations = _generate_explanations(adopter_vector, animal_vector, animal)
        
        results.append({
            "animal": animal,
            "score": score,
            "animal_vector": animal_vector.tolist(),
            "explanations": explanations,
        })
    
    # Ordenar per score descendent
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return results[:limit]


def _generate_explanations(
    adopter_vector: np.ndarray,
    animal_vector: np.ndarray,
    animal: Animal
) -> List[str]:
    """
    Genera explicacions del perque es un bon match.
    
    Args:
        adopter_vector: Vector de l'adoptant
        animal_vector: Vector de l'animal
        animal: Model Animal
    
    Returns:
        Llista de strings amb explicacions
    """
    explanations = []
    
    # Comparar cada dimensio
    dimension_labels = {
        "energy_level": ("nivell d'energia", "tranquil", "actiu"),
        "attention_needs": ("necessitat d'atencio", "independent", "necessita atencio"),
        "sociability": ("sociabilitat", "reservat", "molt sociable"),
        "good_with_children": ("compatibilitat amb nens", "no recomanat", "excellent"),
        "good_with_dogs": ("compatibilitat amb gossos", "no recomanat", "excellent"),
        "good_with_cats": ("compatibilitat amb gats", "no recomanat", "excellent"),
        "experience_required": ("experiencia necessaria", "cap", "molta"),
        "maintenance_level": ("nivell de manteniment", "baix", "alt"),
    }
    
    for i, dim in enumerate(MATCHING_DIMENSIONS):
        adopter_val = adopter_vector[i]
        animal_val = animal_vector[i]
        diff = abs(adopter_val - animal_val)
        
        label, low_desc, high_desc = dimension_labels[dim]
        
        # Si la diferencia es petita, es un bon match en aquesta dimensio
        if diff < 0.3:
            if animal_val > 0.3:
                explanations.append(f"Bon encaix en {label}: {animal.name} es {high_desc}")
            elif animal_val < -0.3:
                explanations.append(f"Bon encaix en {label}: {animal.name} es {low_desc}")
    
    # Limitar a 3-4 explicacions
    return explanations[:4]
