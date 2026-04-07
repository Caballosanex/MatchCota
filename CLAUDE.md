```markdown
# MATCHCOTA - System Prompt del Projecte

## Instruccions per a l'Agent IA

Ets un assistent de desenvolupament per al projecte MatchCota. Aquest document conté tot el context que necessites per ajudar l'equip. Segueix sempre aquestes directrius i utilitza la informació aquí descrita per donar respostes coherents amb l'arquitectura i decisions del projecte.

---

## 1. Visió General del Projecte

### Què és MatchCota?

MatchCota és una plataforma SaaS multi-tenant que connecta protectores d'animals amb adoptants mitjançant un sistema intel·ligent de compatibilitat. Cada protectora té el seu propi subdomini (exemple: `protectora-barcelona.matchcota.com`) però totes comparteixen la mateixa infraestructura.

### Problema que resolem

Moltes adopcions fracassen per manca de compatibilitat entre l'adoptant i l'animal, no per manca d'amor. Això provoca devolucions que són traumàtiques per als animals i frustracions per a les protectores.

### Solució

Un qüestionari que avalua l'estil de vida de l'adoptant i el creua amb les característiques dels animals per mostrar un ranking de compatibilitat amb explicacions.

### Usuaris

1. **Protectores (admin):** Gestionen animals, veuen leads, configuren el seu espai
2. **Adoptants (públic):** Fan el test de compatibilitat, veuen resultats, deixen contacte

---

## 2. Equip i Rols

| Rol | Responsabilitats |
|-----|------------------|
| **ASIX** | Infraestructura, Docker, AWS, CI/CD, seguretat, xarxes, backups |
| **DAW1** | Backend FastAPI, API, autenticació, algoritme de matching, models de dades |
| **DAW2** | Frontend React, UI/UX, components, integració amb API |

---

## 3. Stack Tecnològic

### Backend
- **Llenguatge:** Python 3.11+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0
- **Migracions:** Alembic
- **Autenticació:** JWT (python-jose)
- **Validació:** Pydantic v2

### Frontend
- **Llenguatge:** JavaScript/JSX
- **Framework:** React 18 amb Vite
- **Routing:** React Router v6
- **Estils:** Tailwind CSS
- **HTTP Client:** Fetch API natiu
- **Estat:** React Context (no Redux)

### Base de Dades
- **Principal:** PostgreSQL 15
- **Cache/Sessions:** Redis 7 (opcional per MVP)

### Infraestructura
- **Contenidors:** Docker + Docker Compose
- **Cloud:** AWS (EC2, RDS, S3, CloudFront, Route 53, SES)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions

---

## 4. Arquitectura Multi-tenant

### Concepte clau

Una sola instància de l'aplicació serveix múltiples protectores. L'aïllament es fa per `tenant_id` a nivell de base de dades, NO per infraestructura separada.

### Identificació del tenant

```
1. Usuari accedeix a: protectora-barcelona.matchcota.com
2. Middleware extreu "protectora-barcelona" del subdomini
3. Busca a BD: SELECT * FROM tenants WHERE slug = 'protectora-barcelona'
4. Totes les queries filtren per tenant_id
```

### Regla d'or

**TOTES les queries a la base de dades HAN de filtrar per `tenant_id`** excepte les taules globals (configuració del sistema).

---

## 5. Estructura del Projecte

```
matchcota/
├── docker-compose.yml
├── docker-compose.prod.yml
├── README.md
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py              # Punt d'entrada FastAPI
│       ├── config.py            # Variables d'entorn
│       ├── database.py          # Connexió BD
│       │
│       ├── core/
│       │   ├── security.py      # JWT, hashing
│       │   ├── tenant.py        # Middleware i dependencies tenant
│       │   └── dependencies.py  # Dependencies comunes
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   ├── tenant.py
│       │   ├── user.py
│       │   ├── animal.py
│       │   └── lead.py
│       │
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── tenant.py
│       │   ├── user.py
│       │   ├── animal.py
│       │   ├── lead.py
│       │   └── matching.py
│       │
│       ├── api/
│       │   ├── __init__.py
│       │   ├── deps.py
│       │   └── v1/
│       │       ├── __init__.py
│       │       ├── router.py    # Agrupa tots els routers
│       │       ├── auth.py
│       │       ├── tenants.py
│       │       ├── animals.py
│       │       ├── users.py
│       │       ├── leads.py
│       │       └── matching.py
│       │
│       ├── services/
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── email.py
│       │   └── storage.py       # S3 uploads
│       │
│       ├── matching/
│       │   ├── __init__.py
│       │   ├── questionnaire.py # Definició preguntes
│       │   └── engine.py        # Algoritme de matching
│       │
│       └── tests/
│           ├── __init__.py
│           ├── conftest.py
│           └── test_*.py
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   │
│   ├── public/
│   │   └── assets/
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       │
│       ├── api/
│       │   └── client.js        # Fetch wrapper
│       │
│       ├── contexts/
│       │   ├── TenantContext.jsx
│       │   └── AuthContext.jsx
│       │
│       ├── hooks/
│       │   ├── useTenant.js
│       │   ├── useAuth.js
│       │   └── useApi.js
│       │
│       ├── layouts/
│       │   ├── PublicLayout.jsx
│       │   └── AdminLayout.jsx
│       │
│       ├── pages/
│       │   ├── public/
│       │   │   ├── Home.jsx
│       │   │   ├── Animals.jsx
│       │   │   ├── AnimalDetail.jsx
│       │   │   ├── MatchTest.jsx
│       │   │   └── MatchResults.jsx
│       │   │
│       │   └── admin/
│       │       ├── Dashboard.jsx
│       │       ├── Login.jsx
│       │       ├── AnimalsManager.jsx
│       │       ├── AnimalForm.jsx
│       │       ├── Leads.jsx
│       │       └── Settings.jsx
│       │
│       └── components/
│           ├── ui/              # Components genèrics
│           │   ├── Button.jsx
│           │   ├── Input.jsx
│           │   ├── Card.jsx
│           │   └── Modal.jsx
│           │
│           ├── animals/
│           │   ├── AnimalCard.jsx
│           │   └── AnimalFilters.jsx
│           │
│           └── matching/
│               ├── Question.jsx
│               ├── ProgressBar.jsx
│               └── MatchCard.jsx
│
└── infrastructure/
    ├── terraform/
    │   ├── modules/
    │   │   ├── networking/
    │   │   ├── compute/
    │   │   ├── database/
    │   │   ├── storage/
    │   │   └── security/
    │   │
    │   └── environments/
    │       ├── dev/
    │       └── prod/
    │
    ├── nginx/
    │   └── local.conf
    │
    └── scripts/
        ├── deploy-backend.sh
        └── deploy-frontend.sh
```

---

## 6. Models de Dades

### 1. Taula: PROTECTORA (Tenants)

| Camp | Tipus | Context / Notes |
| --- | --- | --- |
| **id** | UUID | PK |
| **nom_entitat** | String | nom entitat |
| **slug** | String | Unique, Index. "no accents / espais / ..." |
| **direccio** | String | Inclou: adreça, ciutat, codi postal |
| **tel** | String | |
| **email** | String | |
| **cif** | String | |
| **website** | String | |
| **logo_url** | String | |
| **pla_pagament** | JSON/String | Inclou: compte bancari, status. Nota: "més davant" |
| **data_creacio** | DateTime | |

*Nota: Quadre d' "ALERTA! cues/grip/..." i "newsletter $".*

---

### 2. Taula: ANIMALS

| Camp | Tipus | Context / Notes |
| --- | --- | --- |
| **id** | UUID | PK |
| **tenant_id** | UUID | FK -> PROTECTORA.id |
| **nom** | String | |
| **data_naixement** | Date | "data neix o anys" |
| **mida** | String | "mida / pes" |
| **pes** | Decimal | |
| **microxip** | String | Nº de microxip |
| **especie** | String | |
| **raca** | String | |
| **sexe** | String | |
| **ppp** | Bool | |
| **necessitat_atencio** | Decimal | Context: "independència" |
| **sociabilitat** | Decimal | |
| **descripcio** | Text | |
| **condicions_mediques** | Text | |
| **nivell_energia** | Decimal | |
| **foto_urls** | ARRAY(String) | array d'url's |

**Càlcul de Característiques Matching (Animals):**
* **bo_amb_nens**: `Decimal`
* **bo_amb_gossos**: `Decimal`
* **bo_amb_gats**: `Decimal`
* **experiencia_necessaria**: (Vinculat a Necessitat d'atenció, Sociabilitat i Nivell d'energia)

---

### 3. Taula: EMPLEATS (Users)

| Camp | Tipus | Context / Notes |
| --- | --- | --- |
| **id** | UUID | PK |
| **tenant_id** | UUID | FK -> PROTECTORA.id. "a quina prote pertany un empleat?" |
| **usuari_id** | String/UUID | (Potser redundant amb id, o per auth extern?) |
| **nom_usuari** | String | |
| **nom** | String | |
| **email** | String | |
| **contrasenya** | String | Hash |

---

### 4. Taula: LEADS

| Camp | Tipus | Context / Notes |
| --- | --- | --- |
| **id** | UUID | PK |
| **tenant_id** | UUID | FK -> PROTECTORA.id |
| **email** | String | |
| **tel** | String | |
| **nom** | String | |
| **respostes** | JSON | |
| **millors_match** | JSON | |
| **puntuacions** | JSON | |

---

### 5. Taula: QÜESTIONARI

| Camp | Tipus | Context / Notes |
| --- | --- | --- |
| **id** | UUID | PK |
| **tenant_id** | UUID | FK -> PROTECTORA.id |
| **preguntes** | JSON | |
| **pes_respostes** | JSON | |

---

## 7. API Endpoints

### Públics (sense auth)

```
GET  /api/v1/tenant/current           # Info del tenant actual (per subdomini)
GET  /api/v1/animals                  # Llistar animals disponibles
GET  /api/v1/animals/{id}             # Detall animal
GET  /api/v1/matching/questionnaire   # Obtenir preguntes del test
POST /api/v1/matching/calculate       # Calcular matches
POST /api/v1/auth/login               # Login
```

### Privats (amb auth JWT)

```
# Animals
GET    /api/v1/admin/animals          # Llistar tots (incloent no disponibles)
POST   /api/v1/admin/animals          # Crear animal
GET    /api/v1/admin/animals/{id}     # Detall
PUT    /api/v1/admin/animals/{id}     # Actualitzar
DELETE /api/v1/admin/animals/{id}     # Esborrar

# Leads
GET    /api/v1/admin/leads            # Llistar leads
GET    /api/v1/admin/leads/{id}       # Detall lead
PATCH  /api/v1/admin/leads/{id}       # Actualitzar status/notes

# Configuració
GET    /api/v1/admin/settings         # Obtenir config protectora
PUT    /api/v1/admin/settings         # Actualitzar config

# Upload
POST   /api/v1/admin/upload           # Pujar imatge a S3
```

### Convencions API

- Sempre retornar JSON
- Errors amb format: `{"detail": "Missatge d'error"}`
- Paginació: `?skip=0&limit=20`
- Filtres: `?status=available&species=dog`
- HTTP Status codes estàndard (200, 201, 400, 401, 403, 404, 500)

---

## 8. Algoritme de Matching

### Aproximació MVP (Ponderació simple)

NO fem Machine Learning complex. Fem un algoritme de ponderació basat en similitud del cosinus entre vectors.

### Flux

```
1. Adoptant respon qüestionari (15-20 preguntes)
2. Respostes es converteixen en vector numèric (16 dimensions)
3. Cada animal ja té un vector precalculat (mateixes 16 dimensions)
4. Calculem similitud del cosinus entre vectors
5. Ordenem per score i retornem top 10
6. Generem explicació en llenguatge natural
```

### Característiques del vector (16 dimensions)

```python
FEATURES = [
    "child_friendly",      # Bo amb nens
    "dog_friendly",        # Bo amb gossos
    "cat_friendly",        # Bo amb gats
    "energy_level",        # Nivell d'energia
    "exercise_needs",      # Necessitats exercici
    "training_difficulty", # Dificultat entrenament
    "independence",        # Independència
    "special_needs",       # Necessitats especials
    "size_small",          # Mida petit
    "size_medium",         # Mida mitjà
    "size_large",          # Mida gran
    "age_puppy",           # Edat cadell
    "age_young",           # Edat jove
    "age_adult",           # Edat adult
    "age_senior",          # Edat senior
    "prey_drive",          # Instint de caça
]
```

### Fórmula de compatibilitat

```python
def calculate_compatibility(adopter_vector, animal_vector, weights):
    weighted_adopter = adopter_vector * weights
    weighted_animal = animal_vector * weights
    
    cosine_sim = dot(weighted_adopter, weighted_animal) / (
        norm(weighted_adopter) * norm(weighted_animal)
    )
    
    # Convertir de [-1, 1] a [0, 100]
    score = (cosine_sim + 1) * 50
    return round(score, 1)
```

---

## 9. Frontend: Estructura de Rutes

### Rutes públiques

```
/                    → Home de la protectora
/animals             → Catàleg d'animals
/animals/:id         → Fitxa animal
/test                → Qüestionari de matching
/test/results        → Resultats del test
/about               → Sobre la protectora
/login               → Login admin
```

### Rutes admin (protegides)

```
/admin               → Dashboard
/admin/animals       → Gestió animals
/admin/animals/new   → Crear animal
/admin/animals/:id   → Editar animal
/admin/leads         → Llistat leads
/admin/leads/:id     → Detall lead
/admin/settings      → Configuració
```

---

## 10. Convencions de Codi

### Python (Backend)

```python
# Imports ordenats: stdlib, third-party, local
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.tenant import get_current_tenant
from app.models.animal import Animal

# Funcions i variables: snake_case
def get_animal_by_id(animal_id: str, db: Session):
    pass

# Classes: PascalCase
class AnimalService:
    pass

# Constants: UPPER_SNAKE_CASE
MAX_ANIMALS_PER_PAGE = 50

# Type hints sempre
def create_animal(data: AnimalCreate, tenant_id: UUID) -> Animal:
    pass

# Docstrings per funcions públiques
def calculate_matches(responses: dict, limit: int = 10) -> List[dict]:
    """
    Calcula els millors matches per a un adoptant.
    
    Args:
        responses: Respostes del qüestionari
        limit: Nombre màxim de resultats
    
    Returns:
        Llista de matches amb score i explicació
    """
    pass
```

### JavaScript/React (Frontend)

```jsx
// Components: PascalCase, un component per fitxer
// frontend/src/components/animals/AnimalCard.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';

// Props destructurades
export default function AnimalCard({ animal, showScore = false }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Handlers amb prefix "handle"
  const handleClick = () => {
    // ...
  };
  
  // Early return per loading/error states
  if (!animal) return null;
  
  return (
    <div className="animal-card">
      {/* JSX */}
    </div>
  );
}

// Hooks personalitzats: useNomHook
// frontend/src/hooks/useAnimals.js
export function useAnimals(filters) {
  // ...
}

// API calls a carpeta separada
// frontend/src/api/animals.js
export async function fetchAnimals(tenantSlug, filters) {
  // ...
}
```

### CSS (Tailwind)

```jsx
// Utilitzar classes Tailwind, evitar CSS custom
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
  Botó
</button>

// Colors personalitzats a tailwind.config.js
// Utilitzar variables CSS per colors del tenant
<div style={{ backgroundColor: tenant?.primary_color }}>
```

### Git

```bash
# Branques
main              # Producció
develop           # Desenvolupament
feature/XXX       # Noves funcionalitats
bugfix/XXX        # Correccions

# Commits (Conventional Commits)
feat: afegir formulari d'alta d'animal
fix: corregir càlcul de compatibilitat
docs: actualitzar README
style: formatar codi amb prettier
refactor: extreure lògica de matching a servei
test: afegir tests per endpoint animals
chore: actualitzar dependencies

# Exemple
git checkout -b feature/questionnaire-ui
git commit -m "feat: implementar navegació entre preguntes"
git push origin feature/questionnaire-ui
# Crear PR a GitHub
```

---

## 11. Variables d'Entorn

### Backend (.env)

```env
# App
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/matchcota

# Redis (opcional MVP)
REDIS_URL=redis://redis:6379

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
S3_BUCKET_NAME=matchcota-uploads

# Email
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@matchcota.com

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_ENVIRONMENT=development
```

---

## 12. Abast del MVP

### INCLÒS al MVP

- ✅ Sistema multi-tenant bàsic (per slug/subdomini)
- ✅ Autenticació JWT
- ✅ CRUD complet d'animals amb imatges
- ✅ Qüestionari de matching (15-20 preguntes)
- ✅ Algoritme de ponderació per compatibilitat
- ✅ Pàgina de resultats amb top 10
- ✅ Captura de leads amb email
- ✅ Dashboard admin bàsic
- ✅ Deploy a AWS (EC2 + RDS + S3)
- ✅ Domini amb wildcard SSL

### EXCLÒS del MVP (v2 futura)

- ❌ Machine Learning avançat (embeddings, neural networks)
- ❌ Onboarding 100% automàtic de protectores
- ❌ Sistema de pagaments/subscripcions
- ❌ App mòbil nativa
- ❌ Chat integrat
- ❌ Integració amb xarxes socials
- ❌ Analytics avançades
- ❌ Multi-idioma
- ❌ Sistema de notificacions push
- ❌ Seguiment post-adopció

---

## 13. Sprints i Cronograma

| Sprint | Dates | Focus |
|--------|-------|-------|
| 1 | 19/01 | Setup: Docker, GitHub, estructura projecte |
| 2 | 02/02 | Backend: Auth, CRUD, middleware tenant |
| 3 | 16/02 | Frontend: Layouts, navegació, pàgines |
| 4 | 02/03 | Animals: Formularis, imatges, catàleg |
| 5 | 16/03 | Matching: Qüestionari, algoritme, resultats |
| 6 | 06/04 | Infra AWS: Terraform, deploy |
| 7 | 20/04 | Polish: Leads, emails, bugs |
| 8 | 04/05 | Demo: Docs, presentació |

**Temps per sprint:** 6 dies × 2 hores = 12 hores

---

## 14. Comandes Útils

### Desenvolupament local

```bash
# Arrencar tot
docker-compose up -d

# Veure logs
docker-compose logs -f backend

# Entrar al container
docker-compose exec backend bash

# Crear migració
docker-compose exec backend alembic revision --autogenerate -m "descripció"

# Aplicar migracions
docker-compose exec backend alembic upgrade head

# Tests
docker-compose exec backend pytest

# Frontend dev
cd frontend && npm run dev
```

### Deploy

```bash
# Terraform
cd infrastructure/terraform/environments/prod
terraform init
terraform plan
terraform apply

# Deploy manual backend
./infrastructure/scripts/deploy-backend.sh

# Deploy manual frontend
./infrastructure/scripts/deploy-frontend.sh
```

---

## 15. Links i Recursos

- **Repositori:** github.com/[org]/matchcota
- **Trello:** [URL del taulell]
- **Figma:** [URL del disseny]
- **Producció:** matchcota.com
- **API Docs:** api.matchcota.com/docs

---

## 16. Regles per a l'Agent IA

### SEMPRE fer:

1. Filtrar per `tenant_id` en TOTES les queries a BD
2. Usar type hints a Python
3. Validar dades amb Pydantic
4. Retornar errors amb HTTPException i missatges clars
5. Seguir l'estructura de carpetes definida
6. Usar les convencions de noms establertes
7. Mantenir components React petits i reutilitzables
8. Documentar funcions públiques

### MAI fer:

1. Queries sense filtrar per tenant_id (excepció: taula tenants)
2. Guardar secrets al codi
3. Fer console.log en producció
4. Ignorar errors sense tractar-los
5. Crear components monolítics (>200 línies)
6. Usar `any` a TypeScript/ignorar tipus
7. Hardcodejar URLs o configuracions
8. Fer commits directes a main

### Quan tinguis dubtes:

1. Pregunta abans de generar codi complex
2. Proposa múltiples opcions si n'hi ha
3. Indica si una solució és temporal o definitiva
4. Avisa si detectes inconsistències amb aquest document

---

# DEFINICIÓ DEL QÜESTIONARI
QUESTIONNAIRE = [
    # === CATEGORIA: HABITATGE ===
    Question(
        id="housing_type",
        category="housing",
        text="Quin tipus d'habitatge tens?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(
                value="apartment_small",
                label="Pis petit (menys de 60m²)",
                weights={"size_preference": -0.8, "energy_level": -0.5}
            ),
            QuestionOption(
                value="apartment_large",
                label="Pis gran (més de 60m²)",
                weights={"size_preference": 0.0, "energy_level": 0.0}
            ),
            QuestionOption(
                value="house_no_garden",
                label="Casa sense jardí",
                weights={"size_preference": 0.3, "energy_level": 0.2}
            ),
            QuestionOption(
                value="house_garden",
                label="Casa amb jardí",
                weights={"size_preference": 0.8, "energy_level": 0.8}
            ),
        ]
    ),
    
    Question(
        id="outdoor_access",
        category="housing",
        text="Tens accés a espais a l'aire lliure propers?",
        description="Parcs, zones verdes, àrees per passejar",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No, visc en zona molt urbana", weights={"exercise_needs": -0.7}),
            QuestionOption(value="limited", label="Sí, però limitats", weights={"exercise_needs": -0.2}),
            QuestionOption(value="good", label="Sí, bastants a prop", weights={"exercise_needs": 0.4}),
            QuestionOption(value="excellent", label="Sí, molts i amplis", weights={"exercise_needs": 0.8}),
        ]
    ),

    # === CATEGORIA: TEMPS I DEDICACIÓ ===
    Question(
        id="hours_alone",
        category="time",
        text="Quantes hores al dia estarà sol l'animal?",
        type=QuestionType.SCALE,
        min_value=0,
        max_value=12,
        # Això es processa diferent: a més hores, menys compatible amb animals dependents
    ),
    
    Question(
        id="exercise_time",
        category="time",
        text="Quant de temps pots dedicar a passejar/jugar cada dia?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="minimal", label="Menys de 30 minuts", weights={"exercise_needs": -0.8, "energy_level": -0.7}),
            QuestionOption(value="moderate", label="30 min - 1 hora", weights={"exercise_needs": 0.0, "energy_level": 0.0}),
            QuestionOption(value="good", label="1 - 2 hores", weights={"exercise_needs": 0.5, "energy_level": 0.5}),
            QuestionOption(value="high", label="Més de 2 hores", weights={"exercise_needs": 0.9, "energy_level": 0.9}),
        ]
    ),

    # === CATEGORIA: COMPOSICIÓ FAMILIAR ===
    Question(
        id="children",
        category="family",
        text="Hi ha nens a casa?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No", weights={"child_friendly": 0.0}),
            QuestionOption(value="older", label="Sí, majors de 10 anys", weights={"child_friendly": 0.3}),
            QuestionOption(value="young", label="Sí, entre 5 i 10 anys", weights={"child_friendly": 0.7}),
            QuestionOption(value="toddler", label="Sí, menors de 5 anys", weights={"child_friendly": 1.0}),
        ]
    ),
    
    Question(
        id="other_pets",
        category="family",
        text="Tens altres animals a casa?",
        type=QuestionType.MULTIPLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No", weights={}),
            QuestionOption(value="dog", label="Gos/s", weights={"dog_friendly": 1.0}),
            QuestionOption(value="cat", label="Gat/s", weights={"cat_friendly": 1.0}),
            QuestionOption(value="small", label="Animals petits (conills, hàmsters...)", weights={"prey_drive": -1.0}),
        ]
    ),

    # === CATEGORIA: EXPERIÈNCIA ===
    Question(
        id="experience_level",
        category="experience",
        text="Quina experiència tens amb animals?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="Cap, seria el meu primer", weights={"training_difficulty": -0.8, "special_needs": -0.7}),
            QuestionOption(value="some", label="He tingut animals però fa temps", weights={"training_difficulty": -0.3, "special_needs": -0.3}),
            QuestionOption(value="current", label="Tinc o he tingut recentment", weights={"training_difficulty": 0.3, "special_needs": 0.2}),
            QuestionOption(value="expert", label="Molta experiència, incloent casos difícils", weights={"training_difficulty": 0.9, "special_needs": 0.9}),
        ]
    ),

    # === CATEGORIA: PREFERÈNCIES ===
    Question(
        id="size_preference",
        category="preferences",
        text="Quina mida d'animal prefereixes?",
        type=QuestionType.MULTIPLE_CHOICE,
        options=[
            QuestionOption(value="small", label="Petit (menys de 10kg)", weights={"size_small": 1.0}),
            QuestionOption(value="medium", label="Mitjà (10-25kg)", weights={"size_medium": 1.0}),
            QuestionOption(value="large", label="Gran (més de 25kg)", weights={"size_large": 1.0}),
            QuestionOption(value="no_preference", label="M'és igual", weights={"size_small": 0.5, "size_medium": 0.5, "size_large": 0.5}),
        ]
    ),
    
    Question(
        id="age_preference",
        category="preferences",
        text="Quina edat prefereixes?",
        type=QuestionType.MULTIPLE_CHOICE,
        options=[
            QuestionOption(value="puppy", label="Cadell (menys d'1 any)", weights={"age_puppy": 1.0}),
            QuestionOption(value="young", label="Jove (1-3 anys)", weights={"age_young": 1.0}),
            QuestionOption(value="adult", label="Adult (3-8 anys)", weights={"age_adult": 1.0}),
            QuestionOption(value="senior", label="Senior (més de 8 anys)", weights={"age_senior": 1.0}),
            QuestionOption(value="no_preference", label="M'és igual", weights={"age_puppy": 0.5, "age_young": 0.5, "age_adult": 0.5, "age_senior": 0.5}),
        ]
    ),
    
    Question(
        id="energy_preference",
        category="preferences",
        text="Quin nivell d'energia busques?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="calm", label="Tranquil, per fer companyia", weights={"energy_level": -0.8}),
            QuestionOption(value="moderate", label="Moderat, equilibrat", weights={"energy_level": 0.0}),
            QuestionOption(value="active", label="Actiu, per fer activitats", weights={"energy_level": 0.6}),
            QuestionOption(value="very_active", label="Molt actiu, esportista", weights={"energy_level": 1.0}),
        ]
    ),
    
    Question(
        id="special_needs_ok",
        category="preferences",
        text="Estaries obert a adoptar un animal amb necessitats especials?",
        description="Animals amb discapacitats, malalties cròniques o que necessitin medicació",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="no", label="Prefereixo que no", weights={"special_needs": -1.0}),
            QuestionOption(value="mild", label="Depèn, casos lleus sí", weights={"special_needs": 0.0}),
            QuestionOption(value="yes", label="Sí, estic preparat", weights={"special_needs": 1.0}),
        ]
    ),
]

## Fi del System Prompt
```

<!-- GSD:project-start source:PROJECT.md -->
## Project

**MatchCota AWS Production Deployment**

AWS production deployment of MatchCota multi-tenant SaaS platform for animal shelter adoptions. This deployment makes the fully-developed application (matching algorithm, multi-tenancy, admin dashboard, public adoption flow) accessible at `matchcota.tech` with HTTPS via CloudFront, serving multiple shelter subdomains from shared infrastructure (EC2, RDS, S3).

**Core Value:** **Working HTTPS production environment at `matchcota.tech` and `*.matchcota.tech` before Sprint 6 deadline (April 6th).** If only one thing works, it must be: visitors can access the site securely, test the matching flow, and the first shelter (`protectora-pilot`) can manage animals.

### Constraints

- **Budget**: $50 maximum — Forces t3.micro (EC2), db.t3.micro (RDS), no multi-AZ, no NAT
- **Timeline**: Sprint 6 ends April 6th — ~12 days for complete deployment
- **DNS**: matchcota.tech at DotTech registrar — Cannot transfer, must use NS delegation
- **ACM**: Free wildcard cert non-exportable — Must terminate SSL at CloudFront, not EC2
- **IAM**: Lab account with restricted permissions — Use existing LabRole, can't create custom roles
- **Session**: Temporary AWS credentials — May need refresh mid-sprint
- **Region**: us-east-1 required — ACM certs for CloudFront must be in us-east-1
- **Git**: Public repository — No private credentials in code, deploy keys for EC2 access
- **Tech Stack**: No changes to app stack — Infrastructure only, app code is frozen
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtime
- Python 3.11+ — FastAPI application (`backend/`)
- SQL — PostgreSQL queries via SQLAlchemy
- JavaScript (ES Modules) — React SPA (`frontend/`)
- JSX — React components
- CSS — Tailwind utility classes
- YAML — Docker Compose, GitHub Actions workflows
## Runtime
- Python 3.11 (Alpine-based Docker image)
- Uvicorn ASGI server
- Node.js 20 (Alpine-based Docker image)
- Vite dev server (port 5173)
- PostgreSQL 15 (Alpine image)
- Redis 7 (Alpine image, optional - disabled by default)
## Frameworks
| Framework | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109.0 | Backend REST API framework |
| SQLAlchemy | 2.0.25 | ORM and database abstraction |
| Alembic | 1.13.1 | Database migrations |
| Pydantic | 2.5.3 | Request/response validation |
| React | 18.2.0 | Frontend UI library |
| React Router | 6.21.3 | Client-side routing |
| Vite | 5.0.11 | Frontend build tool and dev server |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |
## Key Dependencies
### Backend (`backend/requirements.txt`)
| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.109.0 | Web framework |
| uvicorn[standard] | 0.27.0 | ASGI server |
| sqlalchemy | 2.0.25 | ORM |
| alembic | 1.13.1 | Migrations |
| psycopg2-binary | 2.9.9 | PostgreSQL driver |
| python-jose[cryptography] | 3.3.0 | JWT token handling |
| passlib[bcrypt] | 1.7.4 | Password hashing |
| pydantic | 2.5.3 | Data validation |
| pydantic-settings | 2.1.0 | Environment config |
| email-validator | 2.1.0 | Email validation |
| boto3 | 1.34.28 | AWS S3 SDK |
| aiosmtplib | 3.0.1 | Async email sending |
| numpy | 1.26.3 | Vector math for matching algorithm |
| redis | 5.0.1 | Redis client (optional) |
| httpx | 0.26.0 | HTTP client for testing |
| pytest | 7.4.4 | Testing framework |
| pytest-asyncio | 0.23.3 | Async test support |
| pytest-cov | 4.1.0 | Test coverage |
### Frontend (`frontend/package.json`)
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI library |
| react-dom | ^18.2.0 | React DOM renderer |
| react-router-dom | ^6.21.3 | Client-side routing |
| react-hook-form | ^7.71.2 | Form state management |
| @hookform/resolvers | ^5.2.2 | Form validation resolvers |
| zod | ^4.3.6 | Schema validation |
| tailwindcss | ^3.4.1 | CSS framework |
| vite | ^5.0.11 | Build tool |
| @vitejs/plugin-react | ^4.2.1 | React Vite plugin |
| eslint | ^8.56.0 | Linting |
| autoprefixer | ^10.4.17 | CSS prefixing |
| postcss | ^8.4.33 | CSS processing |
## Configuration
### Environment Variables
- Application: `ENVIRONMENT`, `DEBUG`, `APP_NAME`
- Security: `SECRET_KEY`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
- Database: `DATABASE_URL`, `DB_ECHO`
- Redis: `REDIS_URL`, `REDIS_ENABLED`
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_ENABLED`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
- Multi-tenant: `DEFAULT_SUBDOMAIN`, `WILDCARD_DOMAIN`
- Frontend: `VITE_API_URL`, `VITE_ENVIRONMENT`, `VITE_BASE_DOMAIN`
### Build Configuration
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development environment orchestration |
| `docker-compose.prod.yml` | Production configuration (placeholder) |
| `backend/Dockerfile` | Python 3.11 Alpine container |
| `frontend/Dockerfile` | Node 20 Alpine container |
| `backend/alembic.ini` | Database migration configuration |
| `frontend/vite.config.js` | Vite build/dev config with API proxy |
| `frontend/tailwind.config.js` | Tailwind CSS customization |
| `frontend/postcss.config.js` | PostCSS plugins (Tailwind, Autoprefixer) |
## Build & Dev Tools
| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Alembic | Database schema migrations |
| Vite | Frontend dev server with HMR and production builds |
| ESLint | JavaScript/JSX linting |
| PostCSS | CSS transformation pipeline |
| pytest | Python unit testing |
| MailHog | Email capture for development (port 8025 for UI) |
## Development Commands
# Start all services
# View logs
# Run migrations
# Create migration
# Run backend tests
# Frontend dev (if running outside Docker)
# Frontend build
## Platform Requirements
- Docker and Docker Compose
- Port 8000 (backend API)
- Port 5173 (frontend dev server)
- Port 5432 (PostgreSQL)
- Port 6379 (Redis)
- Port 1025/8025 (MailHog SMTP/UI)
- AWS EC2 for compute
- AWS RDS for PostgreSQL
- AWS S3 for file storage
- AWS SES for email
- Uvicorn with 4 workers
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Code Style
- No linter config files detected (no `.flake8`, `pyproject.toml` linting section, etc.)
- Formatting follows standard Python conventions
- Docstrings in Catalan, code in English
- ESLint referenced in `package.json` but no config file present
- Run via: `npm run lint` (script: `eslint . --ext js,jsx`)
- No Prettier configuration detected
- Config: `frontend/tailwind.config.js`
- Custom colors defined: `primary`, `primary-dark`, `primary-light`
## Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| **Python files** | snake_case | `animals.py`, `tenant.py` |
| **Python functions** | snake_case | `get_animal_by_id()`, `create_access_token()` |
| **Python classes** | PascalCase | `Animal`, `TenantMiddleware` |
| **Python constants** | UPPER_SNAKE_CASE | `MATCHING_DIMENSIONS` |
| **JSX components** | PascalCase file & export | `Button.jsx`, `AnimalForm.jsx` |
| **JS hooks** | useXxx.js | `useAuth.js`, `useApi.js` |
| **JS contexts** | XxxContext.jsx | `AuthContext.jsx`, `TenantContext.jsx` |
| **API modules** | lowercase plural | `animals.js`, `tenants.js` |
| **DB models** | Singular PascalCase | `Animal`, `User`, `Tenant` |
| **DB tables** | lowercase plural | `animals`, `users`, `tenants` |
## Import Organization
## Patterns Used
- ALL database queries MUST filter by `tenant_id`
- Tenant resolved via `TenantMiddleware` (subdomain or `X-Tenant-Slug` header)
- Location: `backend/app/core/tenant.py`
- **API layer** (`backend/app/api/v1/`) - Route definitions, request validation
- **Service layer** (`backend/app/services/`) - Business logic, orchestration
- **CRUD layer** (`backend/app/crud/`) - Direct database operations
- `TenantContext` - Current protectora (shelter)
- `AuthContext` - Current user & auth token
- Pattern: Context + Provider + custom hook
- Example: `AuthContext.jsx` + `useAuth.js`
- `useApi()` hook at `frontend/src/hooks/useApi.js`
- Auto-injects `Authorization` header and `X-Tenant-Slug`
- Returns `{ get, post, put, delete }` methods
- Base schema for shared fields: `AnimalBase`
- Create schema extends Base: `AnimalCreate`
- Update schema with all optional: `AnimalUpdate`
- Response schema with computed fields: `AnimalResponse`
- Location: `backend/app/schemas/`
- Generic components in `frontend/src/components/ui/`
- Props: `variant`, `size`, `isLoading`, `className`
- Example: `Button.jsx`, `Card.jsx`, `Input.jsx`
## Error Handling
## Type Hints & Validation
## Comments & Documentation
## API Conventions
- Success: Return JSON object or array directly
- Error: `{"detail": "Missatge d'error"}`
- Query params: `?skip=0&limit=20`
- Defaults: `skip=0`, `limit=20`
- Max limit enforced: 100
- Query params: `?species=dog&size=small&sex=male`
- Public: `/api/v1/animals`
- Admin: `/api/v1/admin/animals`
## Git Conventions
- `main` - Production
- `develop` - Development
- `feature/XXX` - New features
- `bugfix/XXX` - Bug fixes
- GitHub Actions for Telegram notifications: `.github/workflows/telegram-notify.yml`
- Notifies on push to any branch
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern
## Pattern Overview
- Single codebase serves multiple tenants (protectoras) through subdomain/header-based routing
- Three-tier architecture: Presentation (React), Application (FastAPI), Data (PostgreSQL)
- Clear separation between public endpoints (adopters) and admin endpoints (shelter staff)
- Vector-based compatibility matching using cosine similarity
## Layers
```
```
## Layers Detail
- Purpose: User interface for adopters and shelter admins
- Location: `frontend/src/`
- Contains: React components, contexts, hooks, API clients
- Depends on: Backend API via fetch
- Used by: End users (adopters, shelter staff)
- Purpose: HTTP endpoint definitions, request validation
- Location: `backend/app/api/v1/`
- Contains: FastAPI routers with Pydantic schemas
- Depends on: Services, Core (tenant, auth)
- Used by: Frontend, Swagger UI
- Purpose: Business logic, orchestration
- Location: `backend/app/services/`
- Contains: Domain operations (create_animal, list_animals, etc.)
- Depends on: CRUD layer, Models
- Used by: API routers
- Purpose: Database operations (Create, Read, Update, Delete)
- Location: `backend/app/crud/`
- Contains: SQLAlchemy queries, always filtered by tenant_id
- Depends on: Models, Database session
- Used by: Services
- Purpose: Cross-cutting concerns (auth, tenant resolution)
- Location: `backend/app/core/`
- Contains: Middleware, security functions, dependencies
- Depends on: Config, Database
- Used by: All layers via FastAPI Depends()
- Purpose: Compatibility calculation between adopters and animals
- Location: `backend/app/matching/`
- Contains: Questionnaire definitions, vector math, cosine similarity
- Depends on: Models
- Used by: Matching API endpoints
## Data Flow
- TenantContext: Global tenant info, persisted in sessionStorage
- AuthContext: User + JWT token, persisted in localStorage
- No Redux — React Context + useState for simplicity
## Key Abstractions
| Abstraction | Location | Purpose |
|-------------|----------|---------|
| Tenant | `backend/app/models/tenant.py` | Represents a shelter (protectora), root of multi-tenant isolation |
| TenantMiddleware | `backend/app/core/tenant.py` | Resolves tenant from subdomain/header, injects into request |
| get_current_tenant | `backend/app/core/tenant.py` | FastAPI dependency to get Tenant object in endpoints |
| get_current_user | `backend/app/api/v1/auth.py` | FastAPI dependency for JWT validation + tenant match |
| Animal | `backend/app/models/animal.py` | Pet available for adoption, belongs to tenant |
| TenantContext | `frontend/src/contexts/TenantContext.jsx` | React context providing tenant info globally |
| AuthContext | `frontend/src/contexts/AuthContext.jsx` | React context managing login state and JWT |
| AdminLayout | `frontend/src/layouts/AdminLayout.jsx` | Protected route wrapper + sidebar navigation |
| matching.engine | `backend/app/matching/engine.py` | Cosine similarity calculation between vectors |
## Entry Points
- `backend/app/main.py` — FastAPI application factory, registers middlewares and routers
- Startup: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- `frontend/src/main.jsx` — React entry, mounts App to DOM
- `frontend/src/App.jsx` — Root component with providers and routes
- `docker-compose.yml` — Development orchestration (db, redis, mailhog, backend, frontend)
- `docker-compose.prod.yml` — Production configuration
- `backend/alembic/` — Migration scripts
- Run migrations: `alembic upgrade head`
## Error Handling
- Use `HTTPException(status_code=..., detail="message")` for expected errors
- Pydantic validates request bodies automatically → 422 on validation failure
- Middleware catches tenant resolution errors → 404 or 500 JSON response
- Auth failures → 401/403 with `WWW-Authenticate: Bearer` header
- API calls wrapped in try/catch
- Error state rendered in components
- TenantContext/AuthContext expose `error` state for display
```json
```
## Cross-Cutting Concerns
- Backend: Python logging configured in `app/config.py` (log_level setting)
- No structured logging framework yet — uses standard format
- Request: Pydantic v2 schemas (`backend/app/schemas/`)
- Response: `response_model=` on endpoints ensures output validation
- Frontend: Form validation in components (not centralized)
- JWT tokens created in `backend/app/core/security.py`
- Algorithm: HS256, expiry: 24 hours (configurable)
- Token contains: `sub` (user_id), `tenant_id`, `exp`
- Validated in `get_current_user` dependency
- **CRITICAL:** ALL database queries MUST filter by `tenant_id`
- Middleware injects `tenant_id` into `request.state`
- CRUD functions receive `tenant_id` parameter explicitly
- No cross-tenant data leakage by design
- Development: Permissive (localhost origins)
- Production: Dynamic validation against `*.matchcota.com` regex
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
