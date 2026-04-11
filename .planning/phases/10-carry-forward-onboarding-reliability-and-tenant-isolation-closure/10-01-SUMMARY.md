---
phase: 10-carry-forward-onboarding-reliability-and-tenant-isolation-closure
plan: 01
subsystem: api
tags: [onboarding, tenant-isolation, fastapi, pydantic, pytest]
requires:
  - phase: 09-remote-state-and-secret-management-hardening
    provides: fail-closed readiness posture carried into onboarding hardening
provides:
  - Backend onboarding handoff status contract with curated message/support code envelope
  - Post-create readiness checks (preboot/current/login) without rolling back tenant/admin creation
  - Production host-authority mismatch denial contract for auth and current-tenant surfaces
affects: [frontend-onboarding-diagnostics, auth-flow, tenant-context-resolution]
tech-stack:
  added: []
  patterns:
    - Backend-led onboarding status envelope with deterministic fallback actions
    - Canonical host-authority tenant resolver for production request paths
key-files:
  created:
    - backend/tests/test_onboarding_handoff_contract.py
    - backend/tests/test_auth_host_authority_contract.py
  modified:
    - backend/app/schemas/tenant.py
    - backend/app/services/tenants.py
    - backend/app/api/v1/tenants.py
    - backend/app/core/tenant.py
    - backend/app/api/v1/auth.py
    - backend/tests/test_tenant_registration_atomic.py
    - backend/tests/test_tenant_scope_auth.py
key-decisions:
  - "Keep tenant/admin DB transaction rollback scope limited to creation failure; readiness checks run post-commit and degrade to action_required contract."
  - "Use host-derived tenant as canonical source in production and deny host/hint conflicts with explicit isolation support code."
patterns-established:
  - "Support-code taxonomy by stage: CREATE/CONTEXT/LOGIN prefixes"
  - "Curated user_message_key payloads instead of leaking raw backend detail text"
requirements-completed: [ONBD-07, ONBD-08]
duration: 4 min
completed: 2026-04-11
---

# Phase 10 Plan 01: Backend onboarding contract and host-authority isolation summary

**Backend now returns deterministic onboarding handoff diagnostics with stage-scoped support codes, while production auth/current paths enforce host-authoritative tenant resolution and hard-deny tenant hint conflicts.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-11T20:50:10+02:00
- **Completed:** 2026-04-11T20:54:34+02:00
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Added explicit onboarding response schema contract (`registration_outcome`, `handoff_status`, `checks`, `fallback_actions`, `user_message_key`, `support_code`) and isolation deny schema.
- Implemented post-create readiness evaluation (`preboot/current/login`) that never rolls back successful tenant/admin creation due to downstream readiness issues.
- Enforced production host-authority tenant policy in login and `/api/v1/tenants/current`, including explicit 403 mismatch deny payload with support code.

## Task Commits

1. **Task 1 (RED): Define onboarding/isolation contract tests** - `c6671fb` (test)
2. **Task 1 (GREEN): Implement onboarding/isolation contract schemas** - `7c1303b` (feat)
3. **Task 2 (RED): Add atomic + readiness behavior tests** - `4536824` (test)
4. **Task 2 (GREEN): Implement backend-led post-create handoff checks** - `46fcb1a` (feat)
5. **Task 3 (RED): Add host-authority mismatch denial tests** - `30f19e6` (test)
6. **Task 3 (GREEN): Enforce production host-authority resolver across auth/current** - `6580f46` (feat)

## Files Created/Modified
- `backend/app/schemas/tenant.py` - onboarding handoff and tenant-isolation deny response contracts.
- `backend/app/services/tenants.py` - post-create readiness evaluator + backend-led onboarding payload return.
- `backend/app/api/v1/tenants.py` - create response upgraded to onboarding contract; current tenant now uses canonical resolver.
- `backend/app/core/tenant.py` - canonical host/hint resolver with production mismatch deny behavior.
- `backend/app/api/v1/auth.py` - login path aligned to host-authority policy with explicit mismatch support code.
- `backend/tests/test_onboarding_handoff_contract.py` - onboarding contract regression coverage.
- `backend/tests/test_auth_host_authority_contract.py` - host-authority deny contract regression coverage.
- `backend/tests/test_tenant_registration_atomic.py` - atomic create + readiness degradation behavior assertions.
- `backend/tests/test_tenant_scope_auth.py` - auth/current resolver contract smoke assertions.

## Decisions Made
- Host context is canonical in production for tenant identity; client hints are accepted only when non-conflicting.
- Onboarding reliability favors deterministic success + support-guided fallback over false rollback of successful tenant creation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local verification environment lacked runnable pytest toolchain**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** No system `pytest`, unavailable docker daemon, and Python 3.14 package incompatibilities blocked test execution.
- **Fix:** Created temporary Python 3.12 virtual environment and installed minimal backend test dependencies to execute required suites.
- **Files modified:** None (environment-only workaround)
- **Verification:** All plan and task test commands executed successfully under `.venv312`.
- **Committed in:** n/a (no repository file changes)

**2. [Rule 1 - Bug] Existing atomic tenant tests no longer matched new onboarding return contract**
- **Found during:** Task 2 GREEN
- **Issue:** `create_tenant` now returns onboarding envelope data, causing stale test expectations to fail.
- **Fix:** Updated unit assertions to validate committed tenant/user integrity and onboarding contract fields against new backend response shape.
- **Files modified:** `backend/tests/test_tenant_registration_atomic.py`
- **Verification:** `pytest backend/tests/test_tenant_registration_atomic.py backend/tests/test_onboarding_handoff_contract.py -q` passed.
- **Committed in:** `4536824` (RED) and `46fcb1a` (GREEN)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Deviations were execution-environment and contract-alignment fixes; no scope creep and all targeted behaviors were delivered.

## Authentication Gates
None.

## Issues Encountered
- Local docker daemon unavailable for containerized pytest runs; resolved by temporary local Python 3.12 venv execution path.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ONBD-07/ONBD-08 backend contract and isolation behaviors are in place and regression-tested.
- Frontend plan can now map `user_message_key` + `support_code` directly without parsing raw `detail` payloads.

## Self-Check: PASSED

- FOUND: `.planning/phases/10-carry-forward-onboarding-reliability-and-tenant-isolation-closure/10-01-SUMMARY.md`
- FOUND commits: `c6671fb`, `7c1303b`, `4536824`, `46fcb1a`, `30f19e6`, `6580f46`
