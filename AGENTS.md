<!-- GSD:project-start source:PROJECT.md -->
## Project

**MatchCota AWS Production Deployment**

This project converts the existing MatchCota dev/test codebase into a production deployment for `matchcota.tech` on AWS Academy Lab. The application itself is already built; the work here is production-hardening the code, removing dev-only surfaces, and deploying a locked AWS architecture with Terraform. The result is a live multi-tenant platform where new shelters can register and immediately access their own HTTPS subdomain.

**Core Value:** A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

### Constraints

- **Cloud Account**: AWS Academy Lab (`us-east-1`) with temporary credentials — tokens expire around 4 hours
- **IAM**: Cannot create custom IAM roles — must use existing `LabRole` and `LabInstanceProfile`
- **Architecture**: Locked topology must be preserved (Route 53 wildcard DNS, EC2 nginx static SPA, API Gateway custom domain, Lambda backend in VPC, private RDS, S3 via Gateway endpoint)
- **Service Restrictions**: CloudFront, CloudWatch, and SES are blocked or unavailable in this account
- **Budget**: Hard cap at $50/month — avoid NAT Gateway and Multi-AZ RDS
- **Domain Ownership**: `matchcota.tech` remains at DotTech registrar; Route 53 integration requires NS delegation step
- **Security/Tenancy**: Tenant onboarding must not rely on runtime Route 53 mutation; tenant activation relies on wildcard DNS and tenant-scoped app logic
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.11 (containerized on Alpine) - backend API and business logic in `backend/app/**/*.py`, runtime pinned by `backend/Dockerfile` (`python:3.11-alpine`)
- JavaScript (ES modules, React JSX) - frontend SPA in `frontend/src/**/*.jsx`, module mode in `frontend/package.json`
- SQL (PostgreSQL dialect) - schema/migrations and seed data in `backend/alembic/` and `infrastructure/scripts/seed-data.sql`
- YAML - container orchestration and CI config in `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/telegram-notify.yml`
- Shell/Python scripting - operational scripts in `infrastructure/scripts/*.sh` and `infrastructure/scripts/validate-env.py`
## Runtime
- Backend runtime: Python 3.11 Alpine in `backend/Dockerfile`
- Frontend runtime/build: Node 20 Alpine in `frontend/Dockerfile`
- Local data services: PostgreSQL 15 Alpine + Redis 7 Alpine in `docker-compose.yml`
- Python: `pip` from base image (`backend/Dockerfile`)
- Node: `npm` (`frontend/Dockerfile`, `frontend/package.json`)
- Lockfile: present for frontend (`frontend/package-lock.json`), missing for backend (`backend/requirements.txt` pins versions but no hash-locked lockfile)
## Frameworks
- FastAPI `0.109.0` - backend HTTP API in `backend/requirements.txt`, app bootstrap in `backend/app/main.py`
- SQLAlchemy `2.0.25` + Alembic `1.13.1` - ORM and migrations in `backend/requirements.txt`, engine config in `backend/app/database.py`, migration env in `backend/alembic/env.py`
- React `18.2.0` + React Router DOM `6.21.3` - frontend app and routing in `frontend/package.json`, `frontend/src/App.jsx`
- Backend test stack installed: `pytest 7.4.4`, `pytest-asyncio 0.23.3`, `pytest-cov 4.1.0` in `backend/requirements.txt`
- Frontend test framework: Not detected in `frontend/package.json` scripts/dependencies
- Vite `5.0.11` + `@vitejs/plugin-react 4.2.1` - frontend dev/build in `frontend/package.json`, `frontend/vite.config.js`
- Tailwind CSS `3.4.1` + PostCSS `8.4.33` + Autoprefixer `10.4.17` - styling pipeline in `frontend/package.json`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`
- Uvicorn `0.27.0` (`uvicorn[standard]`) - ASGI server for local/container backend in `backend/requirements.txt`, command in `docker-compose.yml` and `backend/Dockerfile`
- Docker Compose - local multi-service orchestration in `docker-compose.yml`
## Key Dependencies
- `pydantic 2.5.3` + `pydantic-settings 2.1.0` - configuration and validation backbone in `backend/requirements.txt`, used in `backend/app/config.py`
- `python-jose[cryptography] 3.3.0`, `passlib[bcrypt] 1.7.4`, `bcrypt 4.1.3` - JWT/password auth path in `backend/requirements.txt`, used by `backend/app/api/v1/auth.py` and `backend/app/core/security.py`
- `numpy 1.26.3` - matching vector calculations in `backend/app/matching/engine.py`
- `react-hook-form 7.71.2` + `zod 4.3.6` + `@hookform/resolvers 5.2.2` - frontend form validation stack in `frontend/package.json`
- `boto3 1.34.28` - AWS API integration used by `backend/app/services/storage.py` (S3) and `backend/app/services/route53.py` (Route53)
- `psycopg2-binary 2.9.9` - PostgreSQL driver used by SQLAlchemy in `backend/app/database.py`
- `redis 5.0.1` - Redis client installed (`backend/requirements.txt`), feature toggle available in `backend/app/config.py` but no active runtime integration path detected in backend request flow
- `aiosmtplib 3.0.1` - SMTP dependency present in `backend/requirements.txt` for email path
## Configuration
- Central settings model in `backend/app/config.py` loaded from `.env` (`SettingsConfigDict(env_file=".env")`)
- Canonical example variables documented in `.env.example` and `frontend/.env.example`
- Validation helper script for env consistency in `infrastructure/scripts/validate-env.py`
- Local dev service-level overrides (DB/Redis/SMTP/API proxy) in `docker-compose.yml`
- Production env composition is partial/incomplete (`docker-compose.prod.yml` has placeholders and TODO notes)
- Backend image build and runtime in `backend/Dockerfile`
- Frontend image build in `frontend/Dockerfile`
- Vite build config and API proxy in `frontend/vite.config.js`
- Local reverse-proxy reference in `infrastructure/nginx/local.conf`
## Platform Requirements
- Docker + Docker Compose required (`README.md`, `docker-compose.yml`)
- Running services expected locally: backend (`:8000`), frontend (`:5173`), PostgreSQL (`:5432`), Redis (`:6379`), MailHog (`:8025`) from `docker-compose.yml`
- **Current implemented production shape:** containerized FastAPI + React with incomplete compose placeholders in `docker-compose.prod.yml`; no Terraform modules or environments detected under `infrastructure/terraform/`
- **Locked target architecture readiness (required):**
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Backend Python modules use snake_case filenames under `backend/app/` (examples: `backend/app/core/tenant.py`, `backend/app/services/route53.py`, `backend/app/api/v1/auth.py`).
- Frontend React components use PascalCase filenames under `frontend/src/` (examples: `frontend/src/pages/public/RegisterTenant.jsx`, `frontend/src/layouts/AdminLayout.jsx`, `frontend/src/components/animals/AnimalForm.jsx`).
- Frontend hooks use `useX` naming in camelCase files (examples: `frontend/src/hooks/useApi.js`, `frontend/src/hooks/useTenant.js`, `frontend/src/hooks/useAuth.js`).
- API helper modules in frontend use lowercase pluralized domains (examples: `frontend/src/api/tenants.js`, `frontend/src/api/animals.js`, `frontend/src/api/matching.js`).
- Backend functions follow snake_case for route handlers and services (examples: `create_tenant` in `backend/app/services/tenants.py`, `get_current_user` in `backend/app/api/v1/auth.py`, `calculate_matching` in `backend/app/api/v1/matching.py`).
- Frontend component functions are PascalCase (`Landing`, `Login`, `RegisterAnimal`) in files like `frontend/src/pages/platform/Landing.jsx` and `frontend/src/pages/public/Login.jsx`.
- Frontend internal handlers use `handleX` and `onSubmit` conventions in forms (examples in `frontend/src/pages/public/Login.jsx`, `frontend/src/pages/public/RegisterTenant.jsx`, `frontend/src/pages/public/RegisterAnimal.jsx`).
- Python local variables and parameters are snake_case (`tenant_slug`, `current_user`, `jwt_tenant_id`) across `backend/app/api/v1/auth.py` and `backend/app/core/tenant.py`.
- React state uses camelCase (`loadingTenants`, `apiStatus`, `animalCount`) in `frontend/src/pages/platform/Landing.jsx`, `frontend/src/pages/admin/Dashboard.jsx`.
- Environment variables are UPPER_SNAKE_CASE (`DATABASE_URL`, `VITE_API_URL`, `API_PROXY_TARGET`) in `backend/app/database.py`, `frontend/src/hooks/useApi.js`, `frontend/vite.config.js`.
- SQLAlchemy models use PascalCase classes (`Tenant`, `User`, `Animal`) in `backend/app/models/*.py`.
- Pydantic schemas use Base/Create/Update/Response suffix pattern (`TenantCreate`, `UserUpdate`, `AnimalResponse`) in `backend/app/schemas/*.py`.
- Response wrapper schemas for matching are explicit DTOs (`MatchRequest`, `MatchResponse`, `AnimalMatchResult`) in `backend/app/schemas/matching.py`.
## Code Style
- Tool used: Not enforced by repository config for backend; no `pyproject.toml`/`ruff.toml`/`black` config detected at project root.
- Tool used: ESLint script configured for frontend (`"lint": "eslint . --ext js,jsx"`) in `frontend/package.json`, but no checked-in ESLint config file (`frontend/.eslintrc*` or `frontend/eslint.config.*`) detected.
- Key settings: Tailwind utility-first style is standard in JSX (`frontend/src/pages/public/RegisterTenant.jsx`, `frontend/src/layouts/AdminLayout.jsx`).
- Key settings: Vite/React ESM style and semicolon usage are mostly consistent in frontend (`frontend/vite.config.js`, `frontend/src/main.jsx`).
- Tool used: ESLint dependency declared in `frontend/package.json`.
- Key rules: Not detected (rule set file absent), so lint behavior depends on local/editor defaults and cannot be relied on in CI.
## Import Organization
- Not detected. Frontend uses relative import paths only (`../../hooks/useApi` in `frontend/src/pages/public/RegisterAnimal.jsx`).
- Backend uses package-root imports (`from app...`) with container workdir `/app` (`backend/Dockerfile`, `docker-compose.yml`).
## Error Handling
- API layers raise `HTTPException` with status/detail for expected failures in `backend/app/api/v1/auth.py`, `backend/app/api/v1/tenants.py`, `backend/app/services/users.py`.
- Middleware returns JSON errors directly for tenant resolution failures in `backend/app/core/tenant.py`.
- Service methods perform existence checks and raise 404/400 before CRUD writes (`backend/app/services/animals.py`, `backend/app/services/users.py`).
- Frontend API wrappers throw `Error` with backend `detail` fallback (`frontend/src/hooks/useApi.js`, `frontend/src/api/tenants.js`, `frontend/src/api/matching.js`).
- Frontend pages surface error state through local `useState` and conditional UI blocks (`frontend/src/pages/public/Login.jsx`, `frontend/src/pages/public/RegisterTenant.jsx`).
## Logging
- Structured logger usage appears in tenant DNS flow (`logger.info`/`logger.warning`) in `backend/app/services/tenants.py`.
- Operational fallback uses `print` in non-production config validation branch (`backend/app/config.py`).
- Frontend still includes `console.error` in API hook (`frontend/src/hooks/useApi.js`), so production logging discipline is not fully enforced.
## Comments
- Backend comments explain architectural intent and infra constraints (CORS wildcard behavior, S3/IAM assumptions) in `backend/app/main.py` and `backend/app/config.py`.
- Frontend comments are extensive, tutorial-style, and often exceed implementation detail in `frontend/src/App.jsx`, `frontend/src/contexts/AuthContext.jsx`, `frontend/src/pages/platform/Landing.jsx`.
- Use concise intent comments for non-obvious behavior; avoid narrative/tutorial blocks for routine JSX wiring to keep maintenance cost lower.
- Light JSDoc/docstrings are present but inconsistent depth.
- Python docstrings are common in public modules/functions (`backend/app/core/security.py`, `backend/app/api/v1/auth.py`).
- Frontend uses block comments rather than strict JSDoc typedef contracts (`frontend/src/pages/public/RegisterTenant.jsx`, `frontend/src/pages/public/Login.jsx`).
## Function Design
- Backend functions are generally compact and single-purpose in services/CRUD (`backend/app/services/animals.py`, `backend/app/crud/animals.py`).
- Several frontend page components are large monoliths (e.g., `frontend/src/pages/platform/Landing.jsx` ~374 lines, `frontend/src/pages/public/RegisterTenant.jsx` ~300 lines, `frontend/src/pages/public/RegisterAnimal.jsx` ~258 lines).
- Prefer extracting reusable view sections into `frontend/src/components/` for readability and testability.
- FastAPI dependencies are consistently used for DB/session/auth/tenant injection (`Depends(get_db)`, `Depends(get_current_tenant)`, `Depends(get_current_user)`) across `backend/app/api/v1/*.py`.
- Service methods receive explicit `tenant_id` and domain payloads (`backend/app/services/animals.py`, `backend/app/services/users.py`).
- Frontend form handlers rely on React Hook Form data objects (`onSubmit(data)`) in `frontend/src/pages/public/Login.jsx`, `frontend/src/pages/public/RegisterTenant.jsx`, `frontend/src/pages/public/RegisterAnimal.jsx`.
- Backend CRUD returns ORM entities after `commit` + `refresh` (`backend/app/crud/tenants.py`, `backend/app/crud/users.py`, `backend/app/crud/animals.py`).
- Route handlers return typed response models where defined (`response_model=...`) in `backend/app/api/v1/animals.py`, `backend/app/api/v1/matching.py`.
- Frontend API layer returns parsed JSON or throws errors; `useApi` returns null for empty response body (`frontend/src/hooks/useApi.js`).
## Module Design
- Backend modules expose functions/classes directly; no explicit `__all__` contracts (`backend/app/services/*.py`, `backend/app/core/*.py`).
- Frontend uses default exports for page/layout components and named exports for hooks/API helpers (`frontend/src/pages/public/Login.jsx`, `frontend/src/hooks/useApi.js`, `frontend/src/api/tenants.js`).
- Not used in frontend feature folders; imports are direct file-path based.
- Backend has lightweight package init files (`backend/app/api/__init__.py`, `backend/app/services/__init__.py`) but no aggregation exports.
## Documented Conventions vs Actual Adherence
- **Actual adherence:** strong but not universal in data-access helpers.
- **Actual adherence:** mostly followed in backend, but not strict in all files (e.g., mixed ordering in `backend/app/database.py`).
- **Actual adherence:** partially aligned; `console.error` remains in `frontend/src/hooks/useApi.js`, and `print` remains in `backend/app/config.py` development branch.
- **Actual adherence:** partially violated by large page components in `frontend/src/pages/platform/Landing.jsx`, `frontend/src/pages/public/RegisterTenant.jsx`, and `frontend/src/pages/public/RegisterAnimal.jsx`.
- **Actual adherence:** CI quality gate is absent; only notification workflow exists in `.github/workflows/telegram-notify.yml`.
## Dependency and Layering Conventions (Observed)
- Backend layering is consistently API → Service → CRUD → Model in core entity flows:
- Tenant registration flow is API → Service + external integration:
- Frontend layering is Page → hooks/contexts → API helper/fetch:
## Schema and Validation Conventions (Observed)
- SQLAlchemy models define persistence shape in `backend/app/models/*.py`.
- Pydantic schemas define API contracts in `backend/app/schemas/*.py` with Create/Update/Response split.
- Frontend form validation is moving to `react-hook-form` + `zod` in key forms (`frontend/src/pages/public/Login.jsx`, `frontend/src/pages/public/RegisterTenant.jsx`, `frontend/src/pages/public/RegisterAnimal.jsx`).
- Validation duplication is partial: some API-facing frontend pages still rely on manual state and fetch without schema validation (`frontend/src/pages/public/Home.jsx`, `frontend/src/pages/platform/Landing.jsx`).
## Environment Configuration Patterns
- Backend settings are centralized with `pydantic-settings` in `backend/app/config.py` and loaded from `.env` plus runtime env.
- Runtime DB engine currently reads `os.getenv("DATABASE_URL")` directly in `backend/app/database.py`, creating dual config sources (`settings.database_url` and module env read).
- Frontend runtime endpoint pattern uses `import.meta.env.VITE_API_URL` with `/api/v1` fallback in `frontend/src/hooks/useApi.js`, `frontend/src/api/tenants.js`, `frontend/src/api/animals.js`, `frontend/src/api/matching.js`.
- Local dev reverse proxy for API/uploads is defined in `frontend/vite.config.js` and `infrastructure/nginx/local.conf`.
## Quality Risks to Core Value Flow (Registration → Tenant → Subdomain → Admin Login)
- Tenant creation does not block on DNS success (`backend/app/services/tenants.py`), so tenant can be created while subdomain routing is unavailable.
- DNS defaults are environment-bound and contain hardcoded fallback Hosted Zone ID in `backend/app/services/route53.py`, increasing misconfiguration risk across environments.
- Auth depends on tenant slug consistency between request context and JWT in `backend/app/api/v1/auth.py`; missing tenant header/subdomain yields hard failures with no retry orchestration on frontend.
- Tenant detection in frontend is context-driven (`frontend/src/contexts/TenantContext.jsx`) and can fail silently into error state if host/subdomain parsing is wrong.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Request-scoped tenant resolution in backend middleware (`X-Tenant-Slug` or subdomain) with dependency-based access in route handlers via `Depends(get_current_tenant)` in `backend/app/core/tenant.py`.
- Layered backend organization (`api` → `services` → `crud` → `models`) implemented under `backend/app/`.
- Client-driven SPA routing in `frontend/src/App.jsx` with separate public and admin layouts (`frontend/src/layouts/PublicLayout.jsx`, `frontend/src/layouts/AdminLayout.jsx`).
- Infrastructure intent documents AWS production, but implemented infra in-repo is local/dev-first (`docker-compose.yml`) with production scaffolding incomplete (`docker-compose.prod.yml`, `infrastructure/scripts/deploy-*.sh`).
## Layers
- Purpose: Define public/admin endpoints, bind request dependencies, shape response models.
- Location: `backend/app/api/v1/`
- Contains: Route modules (`animals.py`, `auth.py`, `matching.py`, `tenants.py`, `users.py`, `upload.py`).
- Depends on: `backend/app/core/tenant.py`, `backend/app/api/v1/auth.py`, `backend/app/services/*`, `backend/app/schemas/*`.
- Used by: Frontend fetch clients in `frontend/src/api/*.js`, `frontend/src/hooks/useApi.js`.
- Purpose: Apply domain rules and endpoint-facing business orchestration.
- Location: `backend/app/services/`
- Contains: Tenant provisioning + DNS side effect (`tenants.py`, `route53.py`), file storage strategy (`storage.py`), user/animal service logic.
- Depends on: CRUD modules, config, AWS SDK (`boto3` in `backend/app/services/route53.py` and S3 path in `backend/app/services/storage.py`).
- Used by: API layer (`backend/app/api/v1/*.py`).
- Purpose: SQLAlchemy ORM models and direct DB query/commit operations.
- Location: `backend/app/models/`, `backend/app/crud/`, `backend/app/database.py`, `backend/alembic/`.
- Contains: Entities (`Tenant`, `User`, `Animal`, `Lead`, `Questionnaire`), tenant-filtered and generic CRUD helpers, migration history.
- Depends on: PostgreSQL dialect features (UUID/ARRAY), SQLAlchemy session factory.
- Used by: Services, auth dependency, matching endpoint direct query in `backend/app/api/v1/matching.py`.
- Purpose: Convert questionnaire answers to vector and rank animals by cosine similarity.
- Location: `backend/app/matching/engine.py`, `backend/app/matching/questionnaire.py`.
- Contains: 8-dimension vector schema, normalization, compatibility score, explanation generation.
- Depends on: `numpy`, `Animal` model fields.
- Used by: `backend/app/api/v1/matching.py`.
- Purpose: Browser routing, tenant bootstrapping, auth state lifecycle, page rendering.
- Location: `frontend/src/App.jsx`, `frontend/src/contexts/`, `frontend/src/layouts/`, `frontend/src/pages/`.
- Contains: Route tree, context providers, protected admin shell, public page flows (animals, test, results).
- Depends on: Backend API contract (`/api/v1/*`) and tenant headers.
- Used by: End users and admin users.
- Purpose: Build and run app containers and support local reverse-proxy patterns.
- Location: `docker-compose.yml`, `docker-compose.prod.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `infrastructure/nginx/local.conf`.
- Contains: Local PostgreSQL/Redis/MailHog, backend/frontend dev containers, placeholder production compose.
- Depends on: Local Docker daemon, `.env` values, service-name networking.
- Used by: Development and test workflows.
## Data Flow
- Backend: Request-local state only via `request.state` (`tenant_id`, `tenant`) + DB as source of truth.
- Frontend: Tenant context in `frontend/src/contexts/TenantContext.jsx`, auth context/token in `frontend/src/contexts/AuthContext.jsx` + `localStorage`.
## Key Abstractions
- Purpose: Ensure each request operates on a single tenant.
- Examples: `backend/app/core/tenant.py`, `backend/app/api/v1/tenants.py`, `frontend/src/contexts/TenantContext.jsx`.
- Pattern: Middleware + dependency injection on backend; URL-derived context provider on frontend.
- Purpose: Separate endpoint concerns from persistence operations.
- Examples: `backend/app/services/animals.py` with `backend/app/crud/animals.py`; `backend/app/services/users.py` with `backend/app/crud/users.py`.
- Pattern: Thin service wrappers with per-tenant arguments passed to CRUD filters.
- Purpose: Validate identity and tenant alignment per request.
- Examples: `backend/app/api/v1/auth.py`, `backend/app/core/security.py`.
- Pattern: OAuth2 password flow for login + JWT decode check in dependency.
- Purpose: Route file uploads to local disk in dev/test and S3 in production mode.
- Examples: `backend/app/services/storage.py`, static mount in `backend/app/main.py`.
- Pattern: Config-flag branch (`settings.s3_enabled`) with same endpoint contract.
## Entry Points
- Location: `backend/app/main.py`
- Triggers: `uvicorn app.main:app` from `docker-compose.yml` and `backend/Dockerfile` default CMD.
- Responsibilities: App instantiation, middleware registration, dynamic/proxy CORS behavior, static uploads mount, router inclusion, custom OpenAPI security augmentation.
- Location: `frontend/src/main.jsx`
- Triggers: Vite dev/build runtime via scripts in `frontend/package.json`.
- Responsibilities: React root render, strict mode, boot `App` router/context tree.
- Location: `docker-compose.yml`, `docker-compose.prod.yml`
- Triggers: `docker-compose up` (dev/test) and planned prod variant.
- Responsibilities: Start DB/cache/mail/backend/frontend services and local networking.
## Error Handling
- Middleware hard-fails unresolved tenants with 404 or DB errors with 500 in `backend/app/core/tenant.py`.
- Service layer raises `HTTPException` for not-found and conflict conditions in `backend/app/services/animals.py`, `backend/app/services/users.py`, `backend/app/services/tenants.py`.
- Frontend catches request failures and surfaces user-readable message states in pages and hooks (`frontend/src/hooks/useApi.js`, `frontend/src/pages/public/Login.jsx`, `frontend/src/pages/public/MatchTest.jsx`).
## Cross-Cutting Concerns
- Backend payload validation with Pydantic schemas in `backend/app/schemas/*.py`.
- Frontend form validation via `react-hook-form` + `zod` in `frontend/src/pages/public/Login.jsx`.
- OAuth2 password + bearer JWT in `backend/app/api/v1/auth.py` and `backend/app/core/security.py`.
- Admin route protection at UI shell layer in `frontend/src/layouts/AdminLayout.jsx` and at API dependency layer (`Depends(get_current_user)`).
## Multi-Tenant Isolation: Enforced vs At Risk
- Mandatory tenant dependency on most domain endpoints via `Depends(get_current_tenant)` in `backend/app/api/v1/animals.py`, `backend/app/api/v1/users.py`, `backend/app/api/v1/matching.py`, `backend/app/api/v1/upload.py`.
- Tenant-filtered CRUD for animals and users in `backend/app/crud/animals.py` and `backend/app/crud/users.py`.
- JWT tenant binding check (`jwt_tenant_id` must match `request.state.tenant_id`) in `backend/app/api/v1/auth.py`.
- Upload partitioning by tenant id path in `backend/app/services/storage.py`.
- Middleware bypass list in `backend/app/core/tenant.py` excludes `/api/v1/auth/login`, `/api/v1/tenants`, `/api/v1/tenants/`; those routes rely on route-level logic and allow global tenant create/list behavior.
- `check_existing_user` in `backend/app/crud/users.py` is global (`username OR email`) and not tenant-scoped, introducing cross-tenant uniqueness coupling.
- Global endpoint `POST /api/v1/tenants/` in `backend/app/api/v1/tenants.py` has no auth guard, so tenant creation is open at API level.
- Static uploads are publicly mounted under `/uploads` in `backend/app/main.py`; tenant segregation is path-based rather than signed-access enforcement.
## Deployment-Oriented Architecture (AWS target vs repository state)
- Compute/API hosting target aligned to AWS (EC2-based app runtime is referenced by `route53` service assumptions and docs).
- Persistent relational storage on PostgreSQL (RDS target documented in `ENV.md`).
- Object storage on S3 (`backend/app/services/storage.py` S3 branch).
- DNS and wildcard/subdomain model via Route 53 (`backend/app/services/route53.py`).
- Email delivery expected through SES SMTP (`ENV.md` references SES SMTP host).
- CDN/static acceleration expectation exists in project docs (`CLAUDE.md`) via CloudFront.
- Implemented and runnable: local dev/test stack in `docker-compose.yml` with PostgreSQL, Redis, MailHog, FastAPI, Vite.
- Partially implemented: production app config checks in `backend/app/config.py` (`is_production`, secret/S3 requirements).
- Implemented AWS integration code paths: Route53 record automation (`backend/app/services/route53.py`) and S3 upload client (`backend/app/services/storage.py`).
- Not implemented in repo: Terraform root/module tree (no `infrastructure/terraform/` files present), production reverse-proxy/load-balancer config, cert/TLS automation, CI/CD deployment workflow, secrets bootstrap.
- Placeholder only: `docker-compose.prod.yml`, `infrastructure/scripts/deploy-backend.sh`, `infrastructure/scripts/deploy-frontend.sh`.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
