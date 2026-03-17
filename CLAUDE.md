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

### Aproximació: Vectors i similitud del cosinus

Sistema purament matemàtic. Sense Machine Learning, sense LLM, sense OCR, sense factors externs no parametritzables. Les condicions mèdiques dels animals NO alteren el càlcul.

### Flux

```
1. Adoptant respon qüestionari (10 preguntes)
2. Respostes es converteixen en vector numèric (7 dimensions)
3. Cada animal ja té un vector precalculat (mateixes 7 dimensions, les "Característiques de Matching" de la UI)
4. Calculem similitud del cosinus entre els dos vectors
5. Ordenem per score i retornem top 10
```

### Les 7 dimensions del vector

Corresponen exactament als 7 camps de matching que la protectora introdueix per cada animal a la UI (escala 0-10):

```python
DIMENSIONS = [
    "energy_level",        # Nivell d'energia
    "sociability",         # Sociabilitat
    "attention_needs",     # Necessitat d'atenció
    "good_with_children",  # Bo amb nens
    "good_with_dogs",      # Bo amb gossos
    "good_with_cats",      # Bo amb gats
    "experience_required", # Experiència necessària
]
```

### Vector de l'animal (ja existeix a la BD)

Cada animal té aquests 7 valors Decimal (0-10) emmagatzemats directament. El vector de l'animal és simplement:

```python
animal_vector = [animal.energy_level, animal.sociability, animal.attention_needs,
                 animal.good_with_children, animal.good_with_dogs, animal.good_with_cats,
                 animal.experience_required]
```

### Vector de l'adoptant (es construeix a partir del qüestionari)

Les respostes del qüestionari acumulen pesos sobre les 7 dimensions. El resultat és un vector de 7 valors normalitzats a escala 0-10.

### Fórmula de compatibilitat

```python
from numpy import dot
from numpy.linalg import norm

def calculate_compatibility(adopter_vector, animal_vector):
    cosine_sim = dot(adopter_vector, animal_vector) / (
        norm(adopter_vector) * norm(animal_vector)
    )

    # Convertir de [-1, 1] a [0, 100]
    score = (cosine_sim + 1) * 50
    return round(score, 1)
```

### Filtratge previ (opcional)

Preferències de mida i edat s'apliquen com a **filtres previs** (no com a dimensions del vector). Primer es filtra per mida/edat si l'adoptant ha indicat preferència, i després es calcula la similitud del cosinus sobre el subconjunt resultant.

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
- ✅ Qüestionari de matching (10 preguntes)
- ✅ Algoritme vectorial de compatibilitat (similitud del cosinus, 7 dimensions)
- ✅ Pàgina de resultats amb top 10
- ✅ Captura de leads amb email
- ✅ Dashboard admin bàsic
- ✅ Deploy a AWS (EC2 + RDS + S3)
- ✅ Domini amb wildcard SSL

### EXCLÒS del MVP (v2 futura)

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

Cada pregunta acumula pesos sobre les 7 dimensions del vector de l'adoptant.
Les dimensions corresponen als camps de matching dels animals: energy_level, sociability,
attention_needs, good_with_children, good_with_dogs, good_with_cats, experience_required.

Mida i edat són FILTRES PREVIS (no dimensions del vector).

QUESTIONNAIRE = [
    # === CATEGORIA: HABITATGE ===
    Question(
        id="housing_type",
        category="housing",
        text="Quin tipus d'habitatge tens?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="apartment_small", label="Pis petit (menys de 60m²)", weights={"energy_level": 2.0}),
            QuestionOption(value="apartment_large", label="Pis gran (més de 60m²)", weights={"energy_level": 5.0}),
            QuestionOption(value="house_no_garden", label="Casa sense jardí", weights={"energy_level": 6.0}),
            QuestionOption(value="house_garden", label="Casa amb jardí", weights={"energy_level": 9.0}),
        ]
    ),

    Question(
        id="outdoor_access",
        category="housing",
        text="Tens accés a espais a l'aire lliure propers?",
        description="Parcs, zones verdes, àrees per passejar",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No, visc en zona molt urbana", weights={"energy_level": 1.0}),
            QuestionOption(value="limited", label="Sí, però limitats", weights={"energy_level": 4.0}),
            QuestionOption(value="good", label="Sí, bastants a prop", weights={"energy_level": 7.0}),
            QuestionOption(value="excellent", label="Sí, molts i amplis", weights={"energy_level": 9.0}),
        ]
    ),

    # === CATEGORIA: TEMPS I DEDICACIÓ ===
    Question(
        id="hours_alone",
        category="time",
        text="Quantes hores al dia estarà sol l'animal?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="few", label="Menys de 4 hores", weights={"attention_needs": 9.0}),
            QuestionOption(value="half_day", label="4 - 6 hores", weights={"attention_needs": 6.0}),
            QuestionOption(value="work_day", label="6 - 8 hores", weights={"attention_needs": 3.0}),
            QuestionOption(value="long", label="Més de 8 hores", weights={"attention_needs": 1.0}),
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
            QuestionOption(value="high", label="Més de 2 hores", weights={"energy_level": 10.0}),
        ]
    ),

    # === CATEGORIA: COMPOSICIÓ FAMILIAR ===
    Question(
        id="children",
        category="family",
        text="Hi ha nens a casa?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="No", weights={"good_with_children": 0.0}),
            QuestionOption(value="older", label="Sí, majors de 10 anys", weights={"good_with_children": 5.0}),
            QuestionOption(value="young", label="Sí, entre 5 i 10 anys", weights={"good_with_children": 8.0}),
            QuestionOption(value="toddler", label="Sí, menors de 5 anys", weights={"good_with_children": 10.0}),
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

    # === CATEGORIA: EXPERIÈNCIA ===
    Question(
        id="experience_level",
        category="experience",
        text="Quina experiència tens amb animals?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="none", label="Cap, seria el meu primer", weights={"experience_required": 1.0}),
            QuestionOption(value="some", label="He tingut animals però fa temps", weights={"experience_required": 4.0}),
            QuestionOption(value="current", label="Tinc o he tingut recentment", weights={"experience_required": 7.0}),
            QuestionOption(value="expert", label="Molta experiència, incloent casos difícils", weights={"experience_required": 10.0}),
        ]
    ),

    # === CATEGORIA: PREFERÈNCIES ===
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
        text="Quin caràcter prefereixes?",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            QuestionOption(value="independent", label="Independent, que vagi a la seva", weights={"sociability": 2.0}),
            QuestionOption(value="balanced", label="Equilibrat", weights={"sociability": 5.0}),
            QuestionOption(value="affectionate", label="Afectuós i sociable", weights={"sociability": 8.0}),
            QuestionOption(value="very_social", label="Molt sociable, sempre a prop", weights={"sociability": 10.0}),
        ]
    ),

    # === FILTRES PREVIS (no afecten el vector, filtren animals abans del càlcul) ===
    Question(
        id="size_preference",
        category="filters",
        text="Quina mida d'animal prefereixes?",
        type=QuestionType.MULTIPLE_CHOICE,
        is_filter=True,  # No contribueix al vector, s'aplica com a filtre
        options=[
            QuestionOption(value="small", label="Petit (menys de 10kg)"),
            QuestionOption(value="medium", label="Mitjà (10-25kg)"),
            QuestionOption(value="large", label="Gran (més de 25kg)"),
            QuestionOption(value="no_preference", label="M'és igual"),
        ]
    ),

    Question(
        id="age_preference",
        category="filters",
        text="Quina edat prefereixes?",
        type=QuestionType.MULTIPLE_CHOICE,
        is_filter=True,  # No contribueix al vector, s'aplica com a filtre
        options=[
            QuestionOption(value="puppy", label="Cadell (menys d'1 any)"),
            QuestionOption(value="young", label="Jove (1-3 anys)"),
            QuestionOption(value="adult", label="Adult (3-8 anys)"),
            QuestionOption(value="senior", label="Senior (més de 8 anys)"),
            QuestionOption(value="no_preference", label="M'és igual"),
        ]
    ),
]

## Fi del System Prompt
```