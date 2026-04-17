# MatchCota AWS Production Deployment

## Current Milestone: v1.3 (Planning)

**Goal:** Define and execute the next milestone after v1.2 closure.

## What This Is

MatchCota is a production multi-tenant adoption platform for `matchcota.tech` on AWS Academy-compatible infrastructure. The platform supports shelter onboarding to `{slug}.matchcota.tech`, tenant-scoped admin/public flows, and production-safe deployment operations under constrained AWS Academy policies.

## Core Value

A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

## Current State

- Milestones `v1.0`, `v1.1`, and `v1.2` are archived.
- v1.2 delivered and closure-reconciled:
  - Leads backend contracts and isolation-safe admin/public lead APIs.
  - Admin leads list/detail UX with human-readable questionnaire rendering.
  - Adopter results-first lead capture with persisted questionnaire + score context.
  - Indigo token normalization and premium public UX unification across tenant routes.
  - Human verification gate closure plus phase-18 verification backfill to clear audit blockers.
- Archive references:
  - `.planning/milestones/v1.0-ROADMAP.md`
  - `.planning/milestones/v1.0-REQUIREMENTS.md`
  - `.planning/milestones/v1.1-ROADMAP.md`
  - `.planning/milestones/v1.1-REQUIREMENTS.md`
  - `.planning/milestones/v1.1-MILESTONE-AUDIT.md`
  - `.planning/milestones/v1.2-ROADMAP.md`
  - `.planning/milestones/v1.2-REQUIREMENTS.md`
  - `.planning/MILESTONES.md`

## Next Milestone Goals

Focus for the next milestone should prioritize:

- Converting deferred v2 leads/admin workflow items into executable requirements (status notes/history, search/filter extensions, nav and list ergonomics).
- Normalizing validation coverage (Nyquist) across recently closed phases to reduce audit drift risk.
- Maintaining existing AWS Academy constraints and locked architecture while reducing manual verification burden.

## Validated Requirements

- `UX-01`, `UX-02` (validated via phase-11 verification evidence)
- `INFRA-13`, `INFRA-15` (validated via phase-08 Terraform DR codification + readiness/audit evidence)
- `INFRA-14`, `SECU-06`, `SECU-07` (validated via phase-12 promotion of phase-09 secret and remote-state closure)
- `ONBD-07`, `ONBD-08`, `INFRA-16` (validated via phase-13 human/readiness evidence and phase-10 verification promotion)
- `LEAD-01`, `LEAD-02`, `LEAD-03` (validated via phase-14 lead backend verification)
- `ADMU-01`, `ADMU-02` (validated via phase-15 implementation + phase-19 human gate closure)
- `ADOP-01`, `ADOP-02`, `ADOP-03` (validated via phase-16 verification)
- `PAL-01` (validated via phase-17 implementation + phase-19 human visual closure)
- `UX18-01`, `UX18-02`, `UX18-03`, `UX18-04`, `UX18-05` (validated via phase-18 execution + phase-20 verification backfill)

## Active Constraints

- **Cloud Account**: AWS Academy Lab (`us-east-1`) with temporary credentials.
- **IAM**: Use only `LabRole` and `LabInstanceProfile` (no custom IAM role creation).
- **Architecture**: Keep locked topology (Route53 wildcard DNS, EC2 nginx static SPA, API Gateway custom domain, Lambda in VPC, private RDS, S3 via Gateway endpoint).
- **Service Restrictions**: CloudFront, CloudWatch, and SES unavailable in account.
- **Budget**: Keep within approximately $50/month target (avoid NAT Gateway and Multi-AZ RDS).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use AWS Academy-compatible IaC/runtime constraints for v1 | Keep deployment feasible under account restrictions and budget | ✓ Good |
| Use wildcard DNS onboarding instead of per-tenant Route53 mutation | Reduce onboarding fragility and runtime DNS coupling | ✓ Good |
| Serve frontend statically on EC2/nginx and backend on Lambda/API Gateway | Align with target architecture and lower operational complexity | ✓ Good |
| Require runbook-grade readiness + data-audit checks before launch claims | Prevent false-positive production readiness | ✓ Good |
| Keep wildcard DNS onboarding model for v1.1 hardening | Preserve zero-touch tenant activation architecture and avoid runtime DNS mutation | ✓ Adopted |
| Treat DR reproducibility as first-class milestone scope | Reduce recovery risk from temporary credentials and environment resets | ✓ Adopted |
| Promote requirement closure only after evidence-backed verification reconciliation | Prevent optimistic closure and keep audit outcomes trustworthy | ✓ Adopted |
| Close human verification gates explicitly before milestone archival | Keep production-facing UX claims auditable and reproducible | ✓ Adopted |
| Backfill missing phase verification artifacts before closure | Restore plan->summary->verification chain and prevent orphaned requirements | ✓ Adopted |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

<details>
<summary>Archived planning baselines (v1.0, v1.1, v1.2)</summary>

Previous project sections (requirements backlog, milestone-internal context, and pre-v1 planning narrative) are archived in:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`
- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`

</details>

---
*Last updated: 2026-04-17 after v1.2 milestone completion*
