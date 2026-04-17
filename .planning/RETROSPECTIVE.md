# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 - Product Features + UX Unification

**Shipped:** 2026-04-17
**Phases:** 7 | **Plans:** 17 | **Sessions:** n/a

### What Was Built
- Added lead-management backend contracts and tenant-safe admin/public lead APIs with one-of contact enforcement at persistence level.
- Delivered admin leads list/detail UX with status filters, grouped questionnaire readability, and production route readiness.
- Added adopter results-first lead capture with inline confirmation and persisted questionnaire + score context.
- Unified public/admin palette to indigo tokens and delivered premium tenant public UX hierarchy across `/home`, `/animals`, `/animals/:id`, `/test`, and `/test/results`.
- Closed human verification gates and backfilled missing phase-18 verification artifact to resolve audit orphaning at milestone close.

### What Worked
- Dependency-driven phase ordering (backend -> admin/public UI -> visual unification -> verification closure) reduced rework.
- Requirements/verification synchronization at closure time prevented unresolved traceability drift.
- Focused plan artifacts made post-hoc closure reconciliation straightforward even when additional closure phases were introduced.

### What Was Inefficient
- Missing phase verification artifact for phase 18 forced a late backfill closure phase.
- Human-UAT outcomes were captured after implementation completion instead of continuously during phase execution.
- Tooling regression in `gsd-tools audit-open` reduced automation at pre-close checks.

### Patterns Established
- Treat human gates as first-class closure work with explicit summary artifacts (`19-01`, `19-02`).
- Add verification artifact completeness checks before declaring a phase complete to avoid orphaned requirement states.
- Keep milestone-close archive updates atomic (audit -> roadmap -> requirements -> state/project) to reduce context drift.

### Key Lessons
1. Verification artifact completeness must be checked as strictly as code completion before milestone-close decisions.
2. Human confirmation gates need explicit lifecycle artifacts to stay auditable and avoid "implicit done" ambiguity.
3. Late-stage traceability reconciliation is manageable, but earlier synchronization is cheaper and less error-prone.

### Cost Observations
- Model mix: n/a
- Sessions: n/a
- Notable: Closure reliability improved when verification and requirements were reconciled before archival/tagging.

---

## Milestone: v1.1 - Reliability + UX Hardening

**Shipped:** 2026-04-12
**Phases:** 7 | **Plans:** 18 | **Sessions:** n/a

### What Was Built
- Closed tenant preboot UX coverage with reproducible evidence and eliminated first-paint tenant branding instability.
- Terraform-owned frontend edge DR became fully reproducible with output-driven deploy targeting and lock-aware recovery sequencing.
- Runtime secret delivery moved to SSM references with deterministic fail-closed bootstrap verification and promoted phase-09 closure.
- Onboarding reliability and tenant isolation closure was promoted to passed with readiness and human-UAT evidence reconciliation.

### What Worked
- Requirement closure discipline improved when verification, summary frontmatter, and requirements traceability were kept synchronized.
- Fail-closed readiness and script-level contract checks prevented optimistic launch claims.
- Phase-level summaries and verification artifacts made milestone audit reruns fast and deterministic.

### What Was Inefficient
- Human-UAT evidence depended on concise user-confirmed transcript placeholders instead of richer captured artifacts.
- Nyquist validation coverage drifted across phases and was not normalized during milestone execution.

### Patterns Established
- Promote requirement completion only after evidence-backed verification reconciliation, not plan completion alone.
- Treat Terraform outputs as the operational source of truth for deploy targeting and route-contract checks.

### Key Lessons
1. Closing audit gaps early avoids late milestone friction and rework in closure artifacts.
2. Deterministic wrapper scripts for high-friction checks (like secret bootstrap tests) materially reduce verification noise.
3. Cross-artifact consistency (VERIFICATION, REQUIREMENTS, AUDIT) is as important as implementation correctness for reliable signoff.

### Cost Observations
- Model mix: n/a
- Sessions: n/a
- Notable: Evidence-first phase discipline reduced ambiguity during milestone completion.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 7 | Established production-hardening baseline and launch-readiness operations |
| v1.1 | n/a | 7 | Strengthened evidence-backed closure discipline and DR/secret hardening contracts |
| v1.2 | n/a | 7 | Expanded product UX scope and formalized human-gate + verification-backfill closure pattern |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | n/a | n/a | n/a |
| v1.1 | Expanded targeted backend/frontend verification suites | n/a | n/a |
| v1.2 | Added lead-flow and match-results behavior coverage plus verification backfill artifacts | n/a | n/a |

### Top Lessons (Verified Across Milestones)

1. Fail-closed verification gates are essential for trustworthy production claims.
2. Ops/docs/runbook work must be versioned with the same rigor as code to preserve recovery reliability.
3. Human-gated UX validations require explicit closure artifacts to prevent audit/traceability drift.
