# Architecture

**Analysis Date:** 2026-04-07

## Pattern

**Monolith (Modular)** — Single FastAPI backend serving a React SPA frontend, containerized with Docker. Multi-tenant isolation via middleware and database filtering (not separate instances).

## Pattern Overview

**Overall:** Layered Monolith with Multi-Tenant Middleware

**Key Characteristics:**
- Single codebase serves multiple tenants (protectoras) through subdomain/header-based routing
- Three-tier architecture: Presentation (React), Application (FastAPI), Data (PostgreSQL)
- Clear separation between public endpoints (adopters) and admin endpoints (shelter staff)
- Vector-based compatibility matching using cosine similarity

## Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                              │
│  React SPA + Vite + TailwindCSS                                 │
│  - TenantContext: Detects protectora from subdomain/URL param   │
│  - AuthContext: JWT token management                            │
│  - Layouts: PublicLayout, AdminLayout                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/JSON (X-Tenant-Slug header)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION (API)                            │
│  FastAPI + Pydantic v2                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Middleware: TenantMiddleware                              │  │
│  │ - Extracts slug from subdomain or X-Tenant-Slug header    │  │
│  │ - Injects tenant_id into request.state                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ api/v1/     │ │ services/   │ │ crud/       │              │
│  │ (Routers)   │→│ (Business)  │→│ (Data)      │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ matching/: Questionnaire + Cosine Similarity Engine      │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQLAlchemy ORM
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA                                     │
│  PostgreSQL 15 + Alembic migrations                             │
│  - All tables have tenant_id FK (except tenants table)          │
│  - Connection pooling via QueuePool                             │
└─────────────────────────────────────────────────────────────────┘
```

## Layers Detail

**Presentation (Frontend):**
- Purpose: User interface for adopters and shelter admins
- Location: `frontend/src/`
- Contains: React components, contexts, hooks, API clients
- Depends on: Backend API via fetch
- Used by: End users (adopters, shelter staff)

**API Layer (Routers):**
- Purpose: HTTP endpoint definitions, request validation
- Location: `backend/app/api/v1/`
- Contains: FastAPI routers with Pydantic schemas
- Depends on: Services, Core (tenant, auth)
- Used by: Frontend, Swagger UI

**Service Layer:**
- Purpose: Business logic, orchestration
- Location: `backend/app/services/`
- Contains: Domain operations (create_animal, list_animals, etc.)
- Depends on: CRUD layer, Models
- Used by: API routers

**CRUD Layer:**
- Purpose: Database operations (Create, Read, Update, Delete)
- Location: `backend/app/crud/`
- Contains: SQLAlchemy queries, always filtered by tenant_id
- Depends on: Models, Database session
- Used by: Services

**Core Layer:**
- Purpose: Cross-cutting concerns (auth, tenant resolution)
- Location: `backend/app/core/`
- Contains: Middleware, security functions, dependencies
- Depends on: Config, Database
- Used by: All layers via FastAPI Depends()

**Matching Engine:**
- Purpose: Compatibility calculation between adopters and animals
- Location: `backend/app/matching/`
- Contains: Questionnaire definitions, vector math, cosine similarity
- Depends on: Models
- Used by: Matching API endpoints

## Data Flow

**Public Flow (Adopter views animals):**

1. User visits `protectora-barcelona.matchcota.com/animals`
2. TenantContext extracts "protectora-barcelona" from hostname → calls `/api/v1/tenants/current` with `X-Tenant-Slug` header
3. TenantMiddleware validates slug → injects `tenant_id` into `request.state`
4. Animals router calls service → CRUD queries filtered by `tenant_id`
5. JSON response rendered by React component

**Admin Flow (Shelter creates animal):**

1. Admin navigates to `/admin/animals/new` → AdminLayout checks AuthContext
2. If no user, redirect to `/login`
3. Login form POSTs to `/api/v1/auth/login` with `client_id=<tenant_slug>`
4. JWT token returned contains `sub` (user_id) and `tenant_id`
5. Token stored in localStorage → passed in `Authorization: Bearer` header
6. Create animal POST → `get_current_user` validates JWT + tenant match
7. Animal saved with `tenant_id` from authenticated context

**Matching Flow (Compatibility test):**

1. Adopter answers questionnaire (15-20 questions)
2. POST `/api/v1/matching/calculate` with `{ responses: {...}, limit: 10 }`
3. `responses_to_vector()` converts answers to 8-dimension numpy array
4. Each animal converted to vector via `animal_to_vector()`
5. `cosine_similarity()` computes score between adopter and each animal
6. Results sorted, top N returned with explanations

**State Management (Frontend):**
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

**Backend:**
- `backend/app/main.py` — FastAPI application factory, registers middlewares and routers
- Startup: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

**Frontend:**
- `frontend/src/main.jsx` — React entry, mounts App to DOM
- `frontend/src/App.jsx` — Root component with providers and routes

**Docker:**
- `docker-compose.yml` — Development orchestration (db, redis, mailhog, backend, frontend)
- `docker-compose.prod.yml` — Production configuration

**Database:**
- `backend/alembic/` — Migration scripts
- Run migrations: `alembic upgrade head`

## Error Handling

**Strategy:** Fail fast with HTTPException, structured JSON errors

**Backend Patterns:**
- Use `HTTPException(status_code=..., detail="message")` for expected errors
- Pydantic validates request bodies automatically → 422 on validation failure
- Middleware catches tenant resolution errors → 404 or 500 JSON response
- Auth failures → 401/403 with `WWW-Authenticate: Bearer` header

**Frontend Patterns:**
- API calls wrapped in try/catch
- Error state rendered in components
- TenantContext/AuthContext expose `error` state for display

**Standard Error Response:**
```json
{"detail": "Human readable error message"}
```

## Cross-Cutting Concerns

**Logging:**
- Backend: Python logging configured in `app/config.py` (log_level setting)
- No structured logging framework yet — uses standard format

**Validation:**
- Request: Pydantic v2 schemas (`backend/app/schemas/`)
- Response: `response_model=` on endpoints ensures output validation
- Frontend: Form validation in components (not centralized)

**Authentication:**
- JWT tokens created in `backend/app/core/security.py`
- Algorithm: HS256, expiry: 24 hours (configurable)
- Token contains: `sub` (user_id), `tenant_id`, `exp`
- Validated in `get_current_user` dependency

**Multi-Tenant Isolation:**
- **CRITICAL:** ALL database queries MUST filter by `tenant_id`
- Middleware injects `tenant_id` into `request.state`
- CRUD functions receive `tenant_id` parameter explicitly
- No cross-tenant data leakage by design

**CORS:**
- Development: Permissive (localhost origins)
- Production: Dynamic validation against `*.matchcota.com` regex

---

*Architecture analysis: 2026-04-07*
