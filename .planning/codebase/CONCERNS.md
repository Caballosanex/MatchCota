# Codebase Concerns

**Analysis Date:** 2026-04-07

## Technical Debt

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| No test implementations | `backend/app/tests/__init__.py` (empty) | High | High |
| Hardcoded default secrets | `backend/app/config.py:36-39` | High | Low |
| Rate limiting disabled | `backend/app/config.py:123` | Med | Med |
| Redis caching disabled | `backend/app/config.py:63` | Low | Med |
| Commented-out field validator | `backend/app/config.py:103-109` | Low | Low |
| No role-based authorization | `backend/app/api/v1/users.py` | High | Med |
| No password reset functionality | `frontend/src/pages/public/Login.jsx:146` (dead link) | Med | Med |
| Leads endpoint stub | `frontend/src/App.jsx:89` | Med | Med |
| Settings page stub | `frontend/src/App.jsx:90` | Med | Med |
| Console.log in production code | `frontend/src/hooks/useApi.js:44` | Low | Low |

## Known Issues

- [ ] User model has duplicate ID fields — `id` vs `user_id` column at `backend/app/models/user.py:22`
- [ ] Username uniqueness is global, not per-tenant — `backend/app/models/user.py:23` uses `unique=True` without tenant scope
- [ ] Empty pass block silently ignores root domain access — `backend/app/core/tenant.py:32`
- [ ] JWT decode returns None on any error without specific error type — `backend/app/core/security.py:105-106`
- [ ] Password reset link is non-functional — `frontend/src/pages/public/Login.jsx:146`
- [ ] Large components exceed 200+ lines — `frontend/src/pages/admin/AnimalsManager.jsx` (445 lines)

## Security Considerations

- **Default secrets in config** — `backend/app/config.py:36,39` contains `"CHANGE-THIS-IN-PRODUCTION"` defaults. Production validation exists at line 186-190 but relies on startup check. **Status:** Partially mitigated, requires deployment verification.

- **No RBAC system** — All authenticated users have full admin access. No roles (admin/viewer/staff) implemented. `backend/app/api/v1/users.py` uses `get_current_user` but doesn't check permissions. **Recommendation:** Implement role field on User model and authorization middleware.

- **Token stored in localStorage** — `frontend/src/contexts/AuthContext.jsx:129` stores JWT in localStorage, vulnerable to XSS. **Recommendation:** Consider httpOnly cookies or at minimum implement token refresh mechanism.

- **No input sanitization for file uploads** — `backend/app/services/storage.py` validates content-type but doesn't sanitize filenames or check for malicious content. **Status:** Basic validation exists, needs enhancement.

- **CORS permissive in development** — `backend/app/main.py:46-52` allows all methods/headers from localhost origins. **Status:** Acceptable for dev, production uses stricter regex validation.

- **Tenant slug extracted from user input** — `backend/app/core/tenant.py:18,26-28` extracts slug from header/subdomain without additional validation beyond DB lookup. **Status:** Low risk due to DB validation.

- **No rate limiting** — `backend/app/config.py:123` has `rate_limit_enabled: bool = False`. Public endpoints like `/matching/calculate` could be abused. **Recommendation:** Enable rate limiting before production.

## Performance

- **N+1 potential in matching calculation** — `backend/app/api/v1/matching.py:77-79` loads all animals from tenant without pagination, then iterates in `calculate_matches`. For large catalogs, this could be slow.

- **Tenant lookup on every request** — `backend/app/core/tenant.py:41-58` creates new DB session and queries for tenant on each request through middleware. Consider caching tenant info.

- **No database indexes documented** — Animal filters (`species`, `size`, `sex`) at `backend/app/crud/animals.py:22-27` may need composite indexes with `tenant_id` for performance at scale.

- **Full animal data loaded for matching** — `backend/app/api/v1/matching.py:77-79` fetches complete Animal objects when only matching fields are needed. Consider projection query.

- **No connection pooling tuning for scale** — `backend/app/database.py:21-28` has reasonable defaults (pool_size=10, max_overflow=20) but may need adjustment for production load.

## Fragile Areas

- `backend/app/core/tenant.py` — Central multi-tenant middleware. Every route depends on it. The `pass` statement on line 32 silently ignores root domain access which could mask issues. Changes here affect all authenticated operations.

- `backend/app/matching/engine.py` — Core business logic. The 8-dimension vector (`MATCHING_DIMENSIONS`) is tightly coupled between this file and `questionnaire.py`. Changing dimensions requires updating both files and potentially database columns.

- `frontend/src/contexts/TenantContext.jsx` — Tenant detection relies on URL parsing (lines 30-53) with fallback to sessionStorage. Multiple code paths for tenant resolution could lead to inconsistent state.

- `frontend/src/contexts/AuthContext.jsx` — Token management with localStorage. If localStorage format changes or gets corrupted (line 51-56 try/catch), users get silently logged out.

- `backend/app/config.py:216-224` — Settings validation runs at import time. In development, errors are only printed as warnings. Could mask critical misconfigurations.

## Missing/Incomplete

- **No test suite** — `backend/app/tests/` contains only empty `__init__.py`. Zero test coverage means any refactoring is high-risk.

- **No Leads CRUD endpoints** — Model exists at `backend/app/models/lead.py` but no API endpoints, services, or CRUD operations for leads management.

- **No email sending implementation** — `backend/app/config.py:79-86` has SMTP settings but no email service implementation found. Needed for password reset, notifications.

- **No admin settings page** — `frontend/src/App.jsx:90` shows stub "(Pendent)". Tenants cannot update their own configuration.

- **No questionnaire customization per tenant** — `backend/app/matching/questionnaire.py` uses hardcoded `QUESTIONNAIRE` list. Model exists at `backend/app/models/questionnaire.py` but not used.

- **No animal status field** — `backend/app/models/animal.py` has no status field (available/adopted/reserved). Cannot track adoption workflow.

- **No image deletion** — `backend/app/services/storage.py` has upload but no delete function. Orphaned images accumulate.

- **No audit logging** — No tracking of who created/modified records or when. `created_at`/`updated_at` exist but no user attribution.

- **No pagination metadata** — API returns arrays directly without total count or page info. `backend/app/api/v1/animals.py:28-47` has skip/limit but response doesn't include totals.

## Test Coverage Gaps

**Critical areas without tests:**
- `backend/app/core/tenant.py` — Multi-tenant isolation logic
- `backend/app/core/security.py` — JWT creation/validation
- `backend/app/matching/engine.py` — Core matching algorithm
- `backend/app/api/v1/auth.py` — Authentication flow
- `backend/app/services/animals.py` — CRUD operations with tenant filtering

**Risk:** Any change to these files could introduce security vulnerabilities or data leaks between tenants without detection.

**Priority:** High — Implement at minimum:
1. Tenant isolation tests (verify tenant A cannot see tenant B data)
2. Auth flow tests (login, token validation, expiration)
3. Matching algorithm tests (vector calculation, score ranges)

---

*Concerns audit: 2026-04-07*
