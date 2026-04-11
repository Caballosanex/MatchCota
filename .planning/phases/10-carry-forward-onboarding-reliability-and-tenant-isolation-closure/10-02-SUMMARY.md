---
phase: 10-carry-forward-onboarding-reliability-and-tenant-isolation-closure
plan: 02
subsystem: infra
tags: [readiness, routing, bash, operations]
requires:
  - phase: 07-edge-injected-tenant-context-to-remove-fouc
    provides: deterministic tenant preboot and host-routing contract probes
provides:
  - Unified fail-closed readiness orchestration requiring same-pass API and frontend route contract success
  - Stage-oriented diagnostics for missing tenant context and rerun inputs
  - Explicit smoke messaging that keeps INFRA-16 evidence anchored to existing route contract checks
affects: [post-deploy-readiness, deploy-frontend, terraform-smoke]
tech-stack:
  added: []
  patterns: [fail-closed-readiness-gating, canonical-route-contract-evidence]
key-files:
  created:
    - .planning/phases/10-carry-forward-onboarding-reliability-and-tenant-isolation-closure/10-02-SUMMARY.md
  modified:
    - infrastructure/scripts/post-deploy-readiness.sh
    - infrastructure/scripts/deploy-frontend.sh
    - infrastructure/scripts/terraform-smoke.sh
key-decisions:
  - "Keep API and frontend route contract checks coupled in a single readiness pass before emitting complete status."
  - "Preserve existing deploy/readiness route probes as INFRA-16 source of truth instead of adding monitor-only scripts."
patterns-established:
  - "Readiness exits immediately with stage+reason+rereun hint diagnostics on API/frontend contract failures."
  - "Smoke script references readiness contract stage rather than adding parallel validation surfaces."
requirements-completed: [INFRA-16]
duration: 18min
completed: 2026-04-11
---

# Phase 10 Plan 02: INFRA-16 Route Contract Reliability Summary

**Readiness gating now fails closed unless `api.matchcota.tech` and frontend apex/wildcard route contracts pass together in one deterministic run.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-11T19:01:00Z
- **Completed:** 2026-04-11T19:19:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added explicit `test-api` failure handling in post-deploy readiness so `complete pass` is blocked until API + frontend route contracts pass in the same execution.
- Standardized stage-oriented failure diagnostics with actionable rerun hints, including missing known-tenant context guidance.
- Kept INFRA-16 evidence path tied to existing deploy/readiness contract probes and added smoke-stage messaging to reinforce that contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce unified fail-closed route contract pass across apex, wildcard, and API surfaces** - `d9c3e0e` (fix)
2. **Task 2: Reuse existing deterministic route checks without introducing new monitoring-only surfaces** - `6985e05` (chore)

## Files Created/Modified
- `infrastructure/scripts/post-deploy-readiness.sh` - Added `fail_stage` helper, explicit API-stage fail gate, and improved diagnostics/rerun hints.
- `infrastructure/scripts/deploy-frontend.sh` - Clarified verify-only mode as canonical INFRA-16 evidence path using existing route/preboot assertions.
- `infrastructure/scripts/terraform-smoke.sh` - Added messaging that production-domain alignment remains blocked until readiness route-contract stage passes with API stage.

## Decisions Made
- Enforced a same-run API + frontend route-contract dependency at readiness level rather than relying on `set -e` implicit exits alone.
- Treated route contract checks in `deploy-frontend.sh --verify-route-contracts-only` as the single deterministic evidence mechanism for INFRA-16.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

INFRA-16 closure evidence is now explicit and fail-closed with stage diagnostics suitable for rerun triage. Ready for the next Phase 10 plan.

## Self-Check: PASSED

- FOUND: `.planning/phases/10-carry-forward-onboarding-reliability-and-tenant-isolation-closure/10-02-SUMMARY.md`
- FOUND commit: `d9c3e0e`
- FOUND commit: `6985e05`

---
*Phase: 10-carry-forward-onboarding-reliability-and-tenant-isolation-closure*
*Completed: 2026-04-11*
