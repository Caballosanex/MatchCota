# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
matchcota/
├── .planning/              # GSD planning documents
│   └── codebase/           # Architecture analysis docs
├── backend/                # FastAPI Python backend
│   ├── alembic/            # Database migrations
│   │   └── versions/       # Migration scripts
│   ├── app/                # Application code
│   │   ├── api/            # HTTP endpoints
│   │   │   └── v1/         # Versioned API routers
│   │   ├── core/           # Cross-cutting (auth, tenant)
│   │   ├── crud/           # Database operations
│   │   ├── matching/       # Compatibility algorithm
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── services/       # Business logic layer
│   │   └── tests/          # Backend tests
│   ├── uploads/            # Local file uploads (dev)
│   ├── Dockerfile          # Backend container
│   └── requirements.txt    # Python dependencies
├── frontend/               # React SPA frontend
│   ├── src/
│   │   ├── api/            # Fetch wrappers for backend
│   │   ├── components/     # Reusable UI components
│   │   │   ├── animals/    # Animal-specific components
│   │   │   └── ui/         # Generic UI (Button, Input, etc.)
│   │   ├── contexts/       # React global state
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Page skeletons
│   │   └── pages/          # Route components
│   │       ├── admin/      # Protected admin pages
│   │       ├── platform/   # Central platform pages
│   │       └── public/     # Public tenant pages
│   ├── Dockerfile          # Frontend container
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite bundler config
├── infrastructure/         # DevOps and deployment
│   ├── nginx/              # Reverse proxy config
│   ├── scripts/            # Deploy scripts
│   └── terraform/          # AWS IaC (WIP)
├── docker-compose.yml      # Dev environment
├── docker-compose.prod.yml # Production compose
├── .env                    # Environment variables (gitignored)
├── .env.example            # Template for .env
└── CLAUDE.md               # Project system prompt
```

## Directory Purposes

**`backend/app/api/v1/`**
- Purpose: HTTP endpoint definitions grouped by domain
- Contains: FastAPI routers (`animals.py`, `auth.py`, `tenants.py`, `matching.py`, `upload.py`, `users.py`)
- Key files: 
  - `animals.py`: CRUD endpoints for animals (public + admin)
  - `auth.py`: Login, /me endpoints, `get_current_user` dependency
  - `matching.py`: Questionnaire and calculate endpoints

**`backend/app/core/`**
- Purpose: Cross-cutting infrastructure code
- Contains: Middleware, security utilities, shared dependencies
- Key files:
  - `tenant.py`: TenantMiddleware, get_current_tenant, get_tenant_id
  - `security.py`: JWT creation/validation, password hashing

**`backend/app/crud/`**
- Purpose: Raw database operations (no business logic)
- Contains: SQLAlchemy query functions
- Key files:
  - `animals.py`: get_animals_by_tenant, create_animal, update_animal
  - `tenants.py`: Tenant CRUD
  - `users.py`: User CRUD

**`backend/app/matching/`**
- Purpose: Compatibility algorithm implementation
- Contains: Questionnaire definition, vector math
- Key files:
  - `questionnaire.py`: Question definitions with weights
  - `engine.py`: `animal_to_vector()`, `responses_to_vector()`, `cosine_similarity()`, `calculate_matches()`

**`backend/app/models/`**
- Purpose: SQLAlchemy ORM model definitions
- Contains: Table classes with relationships
- Key files:
  - `tenant.py`: Tenant (protectora) model — root entity
  - `animal.py`: Animal model with matching attributes
  - `user.py`: User (empleat) model
  - `lead.py`: Lead model for adoption inquiries
  - `questionnaire.py`: Custom questionnaire storage

**`backend/app/schemas/`**
- Purpose: Pydantic models for request/response validation
- Contains: Create, Update, Response schemas per domain
- Key files:
  - `animal.py`: AnimalCreate, AnimalUpdate, AnimalResponse
  - `matching.py`: MatchRequest, MatchResponse, QuestionnaireResponse
  - `tenant.py`: TenantCreate, TenantResponse
  - `user.py`: UserCreate, UserResponse

**`backend/app/services/`**
- Purpose: Business logic layer between API and CRUD
- Contains: Domain operations, validation, orchestration
- Key files:
  - `animals.py`: list_animals, get_animal, create_animal, update_animal, delete_animal
  - `storage.py`: S3 upload logic (when enabled)
  - `tenants.py`, `users.py`: Respective domain services

**`frontend/src/api/`**
- Purpose: Backend communication layer
- Contains: Fetch wrapper functions
- Key files:
  - `animals.js`: getAnimals, getAnimal
  - `tenants.js`: Tenant API calls
  - `matching.js`: Questionnaire and matching API

**`frontend/src/components/`**
- Purpose: Reusable React components
- Contains: UI building blocks
- Key directories:
  - `ui/`: Generic components (Button, Input, Card, Select, etc.)
  - `animals/`: Animal-specific components (AnimalCard, etc.)

**`frontend/src/contexts/`**
- Purpose: Global React state management
- Contains: Context providers for app-wide data
- Key files:
  - `TenantContext.jsx`: Detects and provides current tenant
  - `AuthContext.jsx`: Manages user auth state and JWT

**`frontend/src/hooks/`**
- Purpose: Custom React hooks for common patterns
- Contains: Hook files
- Key files:
  - `useTenant.js`: Access TenantContext
  - `useAuth.js`: Access AuthContext
  - `useApi.js`: API calling utilities

**`frontend/src/layouts/`**
- Purpose: Page structure templates
- Contains: Wrapper components with navigation
- Key files:
  - `PublicLayout.jsx`: Header + footer for public pages
  - `AdminLayout.jsx`: Sidebar + protected route logic

**`frontend/src/pages/`**
- Purpose: Route-level components (one per URL)
- Contains: Full page implementations
- Key directories:
  - `admin/`: Dashboard, AnimalsManager, AnimalCreate, AnimalEdit
  - `public/`: Home, Animals, AnimalDetail, Login, MatchTest, MatchResults
  - `platform/`: Landing, DemoTest (central platform pages)

## Key File Locations

| What | Where |
|------|-------|
| FastAPI app instance | `backend/app/main.py` |
| Database connection | `backend/app/database.py` |
| Settings/Config | `backend/app/config.py` |
| Alembic config | `backend/alembic.ini` |
| Migration scripts | `backend/alembic/versions/` |
| Tenant middleware | `backend/app/core/tenant.py` |
| JWT security | `backend/app/core/security.py` |
| Auth endpoints | `backend/app/api/v1/auth.py` |
| Animal endpoints | `backend/app/api/v1/animals.py` |
| Matching algorithm | `backend/app/matching/engine.py` |
| React entry | `frontend/src/main.jsx` |
| App routes | `frontend/src/App.jsx` |
| Tenant detection | `frontend/src/contexts/TenantContext.jsx` |
| Auth management | `frontend/src/contexts/AuthContext.jsx` |
| Docker dev config | `docker-compose.yml` |
| Environment template | `.env.example` |

## Naming Conventions

**Backend Files:**
- snake_case for all Python files: `animal.py`, `get_current_user`
- Models: Singular PascalCase class (`Animal`, `Tenant`)
- Schemas: Entity + Action suffix (`AnimalCreate`, `AnimalResponse`)
- Routers: Plural domain name (`animals.py`, `tenants.py`)

**Frontend Files:**
- PascalCase for components: `AnimalCard.jsx`, `PublicLayout.jsx`
- camelCase for utilities/hooks: `useAuth.js`, `animals.js`
- One component per file, filename matches component name

**Directories:**
- Backend: lowercase, snake_case preferred (`api/v1/`, `crud/`)
- Frontend: lowercase, domain-grouped (`pages/admin/`, `components/ui/`)

**Functions:**
- Backend: snake_case (`get_animals_by_tenant`, `create_access_token`)
- Frontend: camelCase (`getAnimals`, `handleClick`)

**Database:**
- Tables: plural snake_case (`tenants`, `animals`, `users`)
- Columns: snake_case (`tenant_id`, `birth_date`, `photo_urls`)

## Where to Add New Code

**New API Endpoint:**
- Router: `backend/app/api/v1/{domain}.py`
- Schema: `backend/app/schemas/{domain}.py`
- Service: `backend/app/services/{domain}.py` (if business logic needed)
- CRUD: `backend/app/crud/{domain}.py` (if new DB queries needed)
- Register router in: `backend/app/main.py`

**New Database Model:**
- Model: `backend/app/models/{entity}.py`
- Import in: `backend/app/models/__init__.py`
- Create migration: `alembic revision --autogenerate -m "add entity table"`

**New React Page:**
- Admin page: `frontend/src/pages/admin/{PageName}.jsx`
- Public page: `frontend/src/pages/public/{PageName}.jsx`
- Add route in: `frontend/src/App.jsx`

**New React Component:**
- Generic UI: `frontend/src/components/ui/{ComponentName}.jsx`
- Domain-specific: `frontend/src/components/{domain}/{ComponentName}.jsx`

**New Custom Hook:**
- Location: `frontend/src/hooks/use{HookName}.js`

**New API Client Function:**
- Location: `frontend/src/api/{domain}.js`

**Utilities/Helpers:**
- Backend: Create `backend/app/utils/` if needed
- Frontend: Create `frontend/src/utils/` if needed

## Special Directories

**`backend/uploads/`**
- Purpose: Local file storage for development
- Generated: Yes (created at runtime)
- Committed: No (gitignored)
- Note: Production uses S3

**`backend/alembic/versions/`**
- Purpose: Database migration scripts
- Generated: Yes (via `alembic revision --autogenerate`)
- Committed: Yes

**`frontend/node_modules/`**
- Purpose: npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (gitignored)

**`.planning/`**
- Purpose: GSD planning and analysis documents
- Generated: By GSD commands
- Committed: Yes

**`__pycache__/`**
- Purpose: Python bytecode cache
- Generated: Yes (by Python)
- Committed: No (gitignored)

## Import Patterns

**Backend (Python):**
```python
# Standard library
from datetime import datetime
from typing import List, Optional
from uuid import UUID

# Third-party
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Local app imports (absolute from app root)
from app.database import get_db
from app.models.animal import Animal
from app.schemas.animal import AnimalCreate, AnimalResponse
from app.core.tenant import get_current_tenant
from app.services import animals as animals_service
```

**Frontend (JavaScript/React):**
```jsx
// React core
import { useState, useEffect, useContext } from 'react';

// React Router
import { Link, useNavigate, Outlet } from 'react-router-dom';

// Local contexts
import { TenantProvider } from './contexts/TenantContext';

// Local hooks
import { useAuth } from '../hooks/useAuth';

// Local components
import Button from '../components/ui/Button';

// Local API
import { getAnimals } from '../api/animals';
```

---

*Structure analysis: 2026-04-07*
