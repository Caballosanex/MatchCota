---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Product Features + UX Unification
status: verifying
stopped_at: Completed 18-03-PLAN.md
last_updated: "2026-04-17T07:48:53.114Z"
last_activity: 2026-04-17
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-15)

**Core value:** A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.
**Current focus:** Phase 18 — we-have-updated-the-colour-palette-but-we-re-missing-the-red

## Current Position

Phase: 18 (we-have-updated-the-colour-palette-but-we-re-missing-the-red) — EXECUTING
Plan: 3 of 3
Milestone: v1.2 (Product Features + UX Unification)
Status: Phase complete — ready for verification
Last activity: 2026-04-17 - Completed quick task 260417-j60: Afegeix suport de migracions automàtiques al deploy pipeline

```
Progress: [█████████░] 93% (13/14 plans)
```

## Milestone Snapshot

- Most recently shipped milestone: `v1.1 Reliability + UX Hardening`
- Archive: `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`
- Historical archive: `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`
- Active requirements file: `.planning/REQUIREMENTS.md`
- Active roadmap: `.planning/ROADMAP.md`

## Carry-Forward Concerns

- Preserve AWS Academy restrictions (LabRole/LabInstanceProfile only; no CloudFront/CloudWatch/SES assumptions).
- Maintain budget controls (no NAT Gateway, no Multi-AZ RDS) and wildcard DNS onboarding model.
- Every code change must deploy to production on AWS — dev environment is out of scope.
- Deploy sequence within each phase is mandatory: Alembic migration → Lambda zip → EC2 static push.

## Accumulated Context

### Roadmap Evolution (v1.2)

- Phase 14 is a hard prerequisite for Phases 15 and 16 — cannot call endpoints that do not exist.
- Phases 15 and 16 are independent of each other once Phase 14 is live — can be developed in parallel.
- Phase 17 is fully independent and must ship as an isolated PR to contain visual regression risk.
- Cross-tenant isolation test must be written and passing in Phase 14 before any UI phase begins.
- Public POST /leads must NOT use the `useApi` hook (requires auth) — follow raw fetch pattern from `src/api/matching.js`.
- Lead list endpoint must return summary fields only (name, contact, date, status) — full JSON on detail endpoint only.
- Results-first is non-negotiable: capture form never shown before match results render.
- Phase 18 added: We have updated the colour palette but we're missing the redo of the applications and ui so that they all are more similar to the lanidng in style. Fe, the ui in any shelter is very basic and doesn't cut it. Good examples of ui are, admin, register tenant and landing. The animals post questionnaire should be viewed smaller than the top match,to make this last one stand out. Animal list for any shelter should be worked on too. Any other page missing from this list should be discussed.

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Four phases (14-17) derived from natural dependency boundaries | Backend unblocks UI; palette is fully isolated |
| Cross-tenant isolation test required in Phase 14 before Phase 15 starts | GDPR-level breach risk; invisible in single-tenant dev |
| Lead list returns summary fields only | Prevent Lambda 6 MB response limit breach at scale |
| Phase 17 as isolated PR | Palette regressions must be self-contained and trivially reversible |
| Lead status filtering is validated in client helpers before endpoint construction | Prevent malformed status query tampering and preserve backend contract |
| Questionnaire formatting is centralized with deterministic unknown-key fallback | Keep detail rendering human-readable while preserving visibility for unmapped keys |
| Preserve host routing and tenant branch logic while upgrading PublicLayout visuals | Prevent tenant/apex behavior regressions during shell redesign |
| Standardize Card/Button/SkeletonCard styling contracts before page rewrites | Enable premium unification in downstream plans without component API churn |
| Keep animals filters bound to existing URL keys (`species`, `size`, `sex`) during premium list redesign | Preserve filter/query integrity and prevent behavior regressions while restyling |
| Preserve `api.get(`/animals/${id}`)` plus existing detail field set during AnimalDetail visual upgrade | Ensure no data-contract drift or unintended information exposure during UI hierarchy changes |

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260417-j60 | Afegeix suport de migracions automàtiques al deploy pipeline | 2026-04-17 | eda79fe | [260417-j60-afegeix-suport-de-migracions-autom-tique](./quick/260417-j60-afegeix-suport-de-migracions-autom-tique/) |

## Session Continuity

Last session: 2026-04-17T07:48:53.111Z
Stopped at: Completed 18-03-PLAN.md
Resume file: None
