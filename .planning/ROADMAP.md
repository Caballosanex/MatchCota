# Roadmap: MatchCota AWS Production Deployment

## Milestones

- [x] **v1.0 MVP** - 7 phases, 25 plans, 59 tasks shipped on 2026-04-09. Archive: `.planning/milestones/v1.0-ROADMAP.md`
- [ ] **v1.1 Reliability + UX Hardening** - active milestone (initialized 2026-04-10)

## Active Milestone Roadmap (v1.1)

**Phases:** 7
**Requirements mapped:** 10 / 10
**Coverage:** 100%

### Phase 07: Edge-injected tenant context to remove FOUC

**Goal:** Eliminate tenant-name flash and stabilize first paint by injecting tenant context at nginx edge before SPA boot.
**Requirements**: `UX-01`, `UX-02`
**Depends on:** Phase 6
**Plans:** 2/2 plans complete

Success criteria:
1. Tenant shell and tenant name render from preboot context with no visible wrong-tenant/default flash.
2. Registration success path lands on `https://{slug}.matchcota.tech/` with deterministic fallback when preboot context cannot be resolved.
3. Edge-injection behavior is documented and validated in deploy smoke checks.

Plans:
- [x] 07-01-PLAN.md — Add preboot tenant context contract in SPA bootstrap and consume it in tenant provider/layout to prevent first-paint branding flash.
- [x] 07-02-PLAN.md — Inject tenant preboot context at nginx edge and extend deploy readiness checks for deterministic tenant-root routing validation.

### Phase 8: Terraform codification for frontend edge disaster recovery

**Goal:** Make frontend edge stack (EC2/EIP/nginx) fully reproducible from Terraform and resilient to lab resets.
**Requirements**: `INFRA-13`, `INFRA-15`
**Depends on:** Phase 07
**Plans:** 3/3 plans complete

Success criteria:
1. Terraform creates and configures frontend EC2 + Elastic IP + nginx bootstrap with no manual post-apply steps.
2. From clean state, operator can rebuild frontend edge infra and restore equivalent routing outcomes.
3. Recovery runbook captures deterministic apply/recovery sequence under temporary-credential interruptions.

Plans:
- [x] 08-01-PLAN.md — Terraform-own frontend edge EC2/EIP lifecycle, nginx baseline bootstrap, and stable edge identity outputs.
- [x] 08-02-PLAN.md — Update layer/deploy scripts to include frontend edge runtime targets and Terraform-output-driven host resolution with SSM/SSH contract parity.
- [x] 08-03-PLAN.md — Harden README + operations runbook with deterministic clean-state recovery sequence and interruption-safe evidence gates.

### Phase 9: Remote state and secret-management hardening

**Goal:** Close infrastructure reproducibility gaps by adding remote Terraform state and SSM-based secret delivery.
**Requirements**: `INFRA-14`, `SECU-06`, `SECU-07`
**Depends on:** Phase 8
**Plans:** 3 plans

Success criteria:
1. Terraform uses remote backend with locking so interrupted applies can resume safely.
2. Runtime secrets are sourced from SSM Parameter Store references rather than local/env-file coupling.
3. Deployment remains compliant with Academy constraints and budget limits (no blocked services, no NAT, no Multi-AZ).

Plans:
- [x] 09-01-PLAN.md — Add dedicated Terraform remote-backend bootstrap stack and lock-aware preflight/apply guardrails.
- [x] 09-02-PLAN.md — Codify interruption-safe lock-resume and break-glass policy in runbook/README plus smoke prerequisite gate.
- [x] 09-03-PLAN.md — Migrate runtime secret delivery to Terraform-managed SSM references with fail-closed Lambda bootstrap.

### Phase 10: Carry-forward onboarding reliability and tenant isolation closure

**Goal:** Close relevant v1.0 debt tied to onboarding reliability and tenant-safe routing after infra hardening.
**Requirements**: `ONBD-07`, `ONBD-08`, `INFRA-16`
**Depends on:** Phase 9
**Plans:** 3/3 plans complete

Success criteria:
1. Registration -> tenant subdomain -> admin login path is atomic and emits actionable diagnostics on failure boundaries.
2. Cross-tenant access denial checks pass across onboarding/auth paths (`SECU-05` carry-forward intent satisfied).
3. Frontend and API edge-routing contracts remain aligned for apex, wildcard tenant hosts, and API custom domain.

Plans:
- [x] 10-01-PLAN.md — Implement backend onboarding handoff status contract with host-authority tenant isolation enforcement and regression tests.
- [x] 10-02-PLAN.md — Enforce fail-closed INFRA-16 readiness alignment across apex, wildcard tenant hosts, and API contracts.
- [x] 10-03-PLAN.md — Wire frontend registration/login UX to curated backend diagnostics and support-code-driven fallback actions.

### Phase 11: Re-verify tenant preboot UX coverage

**Goal:** Restore verifiable evidence for tenant preboot UX outcomes so phase-07 requirements are no longer orphaned at milestone level.
**Requirements**: `UX-01`, `UX-02`
**Depends on:** Phase 07
**Gap Closure:** Closes orphaned requirement gaps from `v1.1-MILESTONE-AUDIT.md` tied to missing phase-07 verification evidence.
**Plans:** 0 plans

Success criteria:
1. Phase 11 produces verification artifacts proving tenant preboot first-paint behavior and signup redirect fallback behavior.
2. UX-01 and UX-02 are linked by evidence across plan summaries, verification output, and requirements traceability.
3. Re-audit no longer reports phase-07 UX requirements as orphaned.

Plans:
- [ ] Plan via `/gsd-plan-phase 11`

### Phase 12: Stabilize secrets bootstrap and close Phase 09 verification

**Goal:** Resolve runtime secret-bootstrap reliability and promote phase-09 verification from `human_needed` to `passed`.
**Requirements**: `INFRA-14`, `SECU-06`, `SECU-07`
**Depends on:** Phase 09
**Gap Closure:** Closes phase-09 requirement and integration gaps from `v1.1-MILESTONE-AUDIT.md`.
**Plans:** 0 plans

Success criteria:
1. `backend/app/tests/test_ssm_secrets.py` runs green with reproducible prerequisites documented in phase artifacts.
2. Phase-09 verification evidence is promoted to passed for remote-state locking and SSM-based runtime secret delivery.
3. Re-audit no longer reports the phase-09 runtime-secrets integration gap.

Plans:
- [ ] Plan via `/gsd-plan-phase 12`

### Phase 13: Close onboarding human-UAT and readiness signoff

**Goal:** Close pending human verification gates so onboarding reliability flows and route-alignment evidence can pass milestone signoff.
**Requirements**: `ONBD-07`, `ONBD-08`, `INFRA-16`
**Depends on:** Phase 10
**Gap Closure:** Closes phase-10 requirement, integration, and flow gaps from `v1.1-MILESTONE-AUDIT.md`.
**Plans:** 0 plans

Success criteria:
1. Human UAT artifacts show passed results for registration fallback diagnostics and tenant-mismatch login denial UX.
2. A same-run readiness execution proves contract alignment for `api.matchcota.tech`, `matchcota.tech`, and `*.matchcota.tech`.
3. Phase-10 verification is promoted to passed and milestone signoff is unblocked in re-audit.

Plans:
- [ ] Plan via `/gsd-plan-phase 13`
