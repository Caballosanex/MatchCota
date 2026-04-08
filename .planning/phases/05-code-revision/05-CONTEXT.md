# Phase 05: Code Revision — Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean the application code (frontend + backend) so it is production-ready for Lambda + API Gateway deployment. No infrastructure changes in this phase — pure code changes committed to this repository.

**In scope:**
- Remove all dev-only content from the React frontend
- Add Mangum Lambda handler to the FastAPI backend
- Fix SQLAlchemy connection pooling for Lambda environments
- Add admin user creation to tenant registration flow
- Remove boto3 Route 53 calls from tenant registration (wildcard DNS handles subdomains)

**Out of scope:** Terraform, AWS console, EC2, deployment scripts (those are Phases 6 and 7).
</domain>

<decisions>
## Implementation Decisions

### Production Architecture (drives all code changes)
- **D-01:** Backend runs as AWS Lambda + Mangum (ASGI adapter). FastAPI code is cleaned and adapted, not replaced.
- **D-02:** All API traffic goes to `api.matchcota.tech` (API Gateway custom domain). Frontend `VITE_API_URL=https://api.matchcota.tech`.
- **D-03:** EC2 serves only the built React frontend. No uvicorn, no Python on EC2.
- **D-04:** Wildcard A record `*.matchcota.tech → EC2 Elastic IP` handles all tenant subdomains. No per-tenant DNS calls on registration.

### Frontend — Dev Content to Remove
- **D-05:** DELETE `frontend/src/pages/platform/DemoTest.jsx` entirely.
- **D-06:** DELETE `frontend/src/pages/public/RegisterAnimal.jsx` entirely. (Dev shortcut: public route posting to admin endpoint — duplicate of `/admin/animals/new`.)
- **D-07:** `frontend/src/App.jsx` — Remove: `/demo` route + DemoTest import; `/register-animal` route + RegisterAnimal import.
- **D-08:** `frontend/src/pages/platform/Landing.jsx` — Remove:
  - `apiStatus` state variable + health check `useEffect`
  - `tenants` state + `loadingTenants` state + `getTenants()` useEffect + `getTenants` import
  - "Veure demo" `<Link to="/demo">` button in hero section
  - Entire DEVICE AREA block (`<div className="bg-slate-900 ...">` and everything inside it)
  - Footer: email `info@matchcota.com` → `info@matchcota.tech`; copyright year `2025` → `2026`

### Frontend — Production Build Config
- **D-09:** Production `.env` for build: `VITE_API_URL=https://api.matchcota.tech`, `VITE_BASE_DOMAIN=matchcota.tech`, `VITE_ENVIRONMENT=production`.
- **D-10:** Create `frontend/.env.production` file with these values so `npm run build` uses them automatically.

### Backend — Lambda Adaptation
- **D-11:** Add `mangum` to `backend/requirements.txt`.
- **D-12:** Create `backend/app/lambda_handler.py`:
  ```python
  from mangum import Mangum
  from app.main import app

  handler = Mangum(app, lifespan="off")
  ```
- **D-13:** `backend/app/database.py` — Use `NullPool` when `ENVIRONMENT=production` to prevent Lambda connection pool exhaustion:
  ```python
  from sqlalchemy.pool import NullPool
  # Pass pool_class=NullPool to create_engine when settings.environment == "production"
  ```
- **D-14:** `backend/app/main.py` — CORS: In production, allow `https://matchcota.tech` and `https://*.matchcota.tech`. Keep localhost for development.

### Backend — Tenant Registration Fix
- **D-15:** `frontend/src/pages/public/RegisterTenant.jsx` — Add `password` + `confirm_password` Zod-validated fields (min 8 chars, passwords must match).
- **D-16:** `backend/app/schemas/tenant.py` — Add `admin_password: str` to `TenantCreate` schema.
- **D-17:** `backend/app/services/tenants.py` — After creating tenant, atomically create admin `User`:
  - `email` = tenant email
  - `username` = tenant email
  - `name` = tenant name (shelter name)
  - `password_hash` = `get_password_hash(admin_password)` from `app.core.security`
  - `tenant_id` = new tenant id
  - No Alembic migration needed — users table schema is unchanged.
- **D-18:** Registration success message: "La teva protectora ja és activa a `{slug}.matchcota.tech` — accedeix amb el teu email i contrasenya."

### Route 53 / DNS Automation — Removed
- **D-19:** Remove Route 53 boto3 calls from `create_tenant()` in `backend/app/services/tenants.py`. Wildcard `*.matchcota.tech` resolves all subdomains without DNS automation.
- **D-20:** Keep `backend/app/services/route53.py` in the codebase but do not call it from tenant registration.

### Claude's Discretion
- Zod `refine()` for password confirmation match validation in RegisterTenant
- Whether to show a password strength meter (no — keep the form clean)
- Exact Zod error messages (follow existing form patterns in the codebase)
- Whether to add a `confirm_admin_password` field or just `admin_password` on the backend schema (backend only needs `admin_password` — confirmation is frontend-only validation)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files to modify
- `frontend/src/App.jsx` — Routes to remove
- `frontend/src/pages/platform/Landing.jsx` — Dev content to remove
- `frontend/src/pages/public/RegisterTenant.jsx` — Add password fields
- `backend/app/database.py` — Add NullPool for Lambda
- `backend/app/main.py` — CORS configuration
- `backend/app/services/tenants.py` — Add admin user creation, remove Route 53 call
- `backend/app/schemas/tenant.py` — Add admin_password field
- `backend/requirements.txt` — Add mangum

### Files to delete
- `frontend/src/pages/platform/DemoTest.jsx`
- `frontend/src/pages/public/RegisterAnimal.jsx`

### Files to create
- `backend/app/lambda_handler.py` — Mangum handler
- `frontend/.env.production` — Production build env vars

### Architecture reference
- `.planning/ROADMAP.md` §"Architecture (FINAL)" — locked architecture diagram
- `backend/app/core/security.py` — `get_password_hash()` function for admin password hashing
- `backend/app/models/user.py` — User model fields to match when creating admin user

### No external specs — all decisions captured above
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/pages/public/RegisterTenant.jsx`: Zod + react-hook-form already set up — add password fields following the exact same pattern used for other fields.
- `backend/app/core/security.py`: `get_password_hash()` exists — use directly for admin password.
- `backend/app/models/user.py` + `backend/app/crud/users.py` (if exists): Check exact field names before creating the admin user record.
- Existing `TenantCreate` schema pattern: follow same extend-the-base-schema pattern.

### Established Patterns
- Form validation: Zod schemas + react-hook-form (see `AnimalCreate.jsx` or `AnimalEdit.jsx` for reference)
- Backend password hashing: `passlib[bcrypt]` via `get_password_hash()` in `security.py`
- Service layer: `create_tenant()` in `services/tenants.py` — admin user creation goes at the end of this function, same transaction or immediately after

### Integration Points
- `backend/app/api/v1/tenants.py` calls `create_tenant()` — no router changes needed
- `frontend/src/api/client.js` reads `VITE_API_URL` — `.env.production` file changes this automatically on build
- `backend/app/config.py` — Check if `ENVIRONMENT` setting already exists; use it for NullPool condition
</code_context>

<specifics>
## Specific Context

- User is ASIX (infrastructure role) — code-level decisions are made by Claude, not the user
- CloudFront is permanently blocked in the AWS Academy Lab account — do not retry
- Existing ACM wildcard cert (`*.matchcota.tech`) covers `api.matchcota.tech` — available for API Gateway custom domain in Phase 6
- No seed data in production — all data comes from real tenant registrations and real user interactions
- The `protectora-pilot` demo tenant will be created via the real registration form during Phase 7 verification (not SQL seed)
- Terraform state is stale (Phase 4 EC2 destroyed outside Terraform) — Phases 6 and 7 must account for this
</specifics>

<deferred>
## Deferred to Later Phases

### Phase 6 (Lambda + API Gateway)
- Terraform `lambda` module: function, IAM (LabRole), VPC config (private subnet), env vars
- Terraform `api_gateway` module: HTTP API, Lambda proxy integration, custom domain `api.matchcota.tech`
- Lambda deployment package: zip backend + dependencies
- S3 VPC Gateway endpoint (free, no NAT needed)
- Lambda env vars: DATABASE_URL, S3_ENABLED, S3_BUCKET_NAME, JWT_SECRET_KEY, SECRET_KEY, WILDCARD_DOMAIN, ROUTE53_ZONE_ID (kept but unused)

### Phase 7 (EC2 Frontend + Verification)
- Terraform compute module: simplified EC2 (nginx only, no uvicorn), Elastic IP
- Let's Encrypt wildcard cert via certbot-dns-route53
- Route 53 A records: `matchcota.tech` + `*.matchcota.tech` → EC2 Elastic IP
- Frontend build + deploy to EC2 nginx
- `infrastructure/scripts/deploy-backend.sh` — package Lambda zip + update function
- `infrastructure/scripts/deploy-frontend.sh` — build React + sync to EC2
- Terraform state reconciliation (stale Phase 4 resources)
- Full E2E verification

### Permanently deferred
- boto3 per-tenant Route 53 automation — removed in favour of wildcard
- Email notifications (SES blocked in lab account)
- Password reset flow (requires email)
- CI/CD pipeline (GitHub Actions)
- CloudFront (blocked in AWS Academy Lab)
</deferred>

---

*Phase: 05-code-revision*
*Context gathered: 2026-04-08*
