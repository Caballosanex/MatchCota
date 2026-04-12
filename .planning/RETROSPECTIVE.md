# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

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

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | n/a | n/a | n/a |
| v1.1 | Expanded targeted backend/frontend verification suites | n/a | n/a |

### Top Lessons (Verified Across Milestones)

1. Fail-closed verification gates are essential for trustworthy production claims.
2. Ops/docs/runbook work must be versioned with the same rigor as code to preserve recovery reliability.
