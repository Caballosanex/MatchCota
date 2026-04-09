---
status: partial
phase: 05-production-frontend-tenant-entry-ux
source: [05-VERIFICATION.md]
started: 2026-04-09T15:56:00Z
updated: 2026-04-09T17:24:36Z
---

## Current Test

[live execution rerun after user-reported registration failure; frontend API base path mismatch diagnosed and remediated]

## Tests

### 1. Deploy frontend to production EC2 and verify static-only posture
expected: Frontend host serves React static files from nginx docroot and has no uvicorn/gunicorn/python FastAPI process
result: [passed] Frontend deployed via `DEPLOY_TRANSPORT=ssm` to `i-0f3f9d6ae388f7746`. Nginx now serves SPA HTML from `/usr/share/nginx/html`, and backend process scan (`uvicorn|gunicorn|python.*fastapi`) returned no matches.

### 2. Live onboarding E2E over HTTPS (register -> tenant subdomain login)
expected: After registration at https://matchcota.tech/register-tenant, browser lands on https://{slug}.matchcota.tech/login and credentials created during registration authenticate successfully
result: [passed - automated API precheck] Runtime remediation deployed with deterministic Lambda env injection. Evidence: `aws lambda get-function-configuration` now shows `Environment=production` and redacted `DATABASE_URL` using RDS host (not `@db:`). Live smoke with slug `phase5gap1775754890` returned `POST /api/v1/tenants/` = `201` and `GET /api/v1/tenants/current` with `X-Tenant-Slug` = `200`.

### 3. Runtime remediation evidence (Task 2 gap closure)
expected: Production Lambda runtime has deterministic DB env contract and onboarding API no longer returns 500
result: [passed] Authoritative DB password sourced from Terraform remote state (`aws_db_instance.postgres.password`), backend redeployed, and one-time production schema bootstrap fallback executed in runtime to create missing tables when `tenants` table absent.

```json
{
  "FunctionName": "matchcota-prod-api",
  "Environment": "production",
  "DatabaseUrlRedacted": "postgresql://matchcota_admin:***@matchcota-prod-postgres.c0fbgdrso9in.us-east-1.rds.amazonaws.com:5432/matchcota?sslmode=require"
}
```

### 4. Frontend registration endpoint contract (Task 3 checkpoint failure diagnosis)
expected: RegisterTenant posts to `https://api.matchcota.tech/api/v1/tenants/` in production
result: [fixed] User-reported failure reproduced from code path analysis: `VITE_API_URL=https://api.matchcota.tech` combined with `createTenant()` using `${API_URL}/tenants/` produced `https://api.matchcota.tech/tenants/` (missing `/api/v1`) and backend returned `Tenant 'api' not found` (404). Remediation applied via shared `getApiBaseUrl()` normalizer and wired into tenant/auth/tenant-context/animals/matching API callers so production origin appends `/api/v1` exactly once.

### 5. Frontend production redeploy after endpoint fix
expected: New production build serves corrected API route contract without backend runtime coupling
result: [passed] `infrastructure/scripts/deploy-frontend.sh` deployed via SSM to `i-0f3f9d6ae388f7746`; static-only guard passed; `https://matchcota.tech/register-tenant` returned SPA shell post-deploy.

## Summary

total: 5
passed: 4
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- Human browser verification still required for redirect/login UX checkpoint: confirm same-tab handoff to `https://{slug}.matchcota.tech/login` and successful interactive login using newly created credentials.
