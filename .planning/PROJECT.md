# MatchCota AWS Production Deployment

## What This Is

MatchCota is now in a shipped v1.0 production state for `matchcota.tech` on AWS Academy-compatible infrastructure patterns. The codebase contains production deployment operations, validation scripts, and runbook workflows to maintain the registration -> tenant subdomain -> login core flow over HTTPS.

## Core Value

A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

## Current State

- Milestones `v1.0` and `v1.1` are now archived.
- v1.1 delivered tenant preboot UX stabilization, Terraform-owned frontend edge DR recovery, remote-state + lock-aware operations hardening, and SSM runtime secret bootstrap closure.
- Onboarding reliability and tenant-isolation carry-forward work is evidence-closed (ONBD-07, ONBD-08, INFRA-16) with passed milestone audit.
- Archive references:
  - `.planning/milestones/v1.0-ROADMAP.md`
  - `.planning/milestones/v1.0-REQUIREMENTS.md`
  - `.planning/milestones/v1.1-ROADMAP.md`
  - `.planning/milestones/v1.1-REQUIREMENTS.md`
  - `.planning/MILESTONES.md`

## Next Milestone Goals

Focus for the next milestone should prioritize:

- Deepen verification discipline (close Nyquist validation debt across phases where validation artifacts are missing/partial).
- Improve onboarding operational visibility (SLA-style readiness metrics and operator diagnostics rollout).
- Keep architecture and AWS Academy constraints unchanged while reducing manual evidence capture burden.

## Validated Requirements (v1.1)

- `UX-01`, `UX-02` (validated via phase-11 verification evidence)
- `INFRA-13`, `INFRA-15` (validated via phase-08 Terraform DR codification + readiness/audit evidence)
- `INFRA-14`, `SECU-06`, `SECU-07` (validated via phase-12 promotion of phase-09 secret and remote-state closure)
- `ONBD-07`, `ONBD-08`, `INFRA-16` (validated via phase-13 human/readiness evidence and phase-10 verification promotion)

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
<summary>Archived planning baselines (v1.0, v1.1)</summary>

Previous project sections (requirements backlog, milestone-internal context, and pre-v1 planning narrative) are archived in:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`

</details>

---
*Last updated: 2026-04-12 after v1.1 milestone completion*
