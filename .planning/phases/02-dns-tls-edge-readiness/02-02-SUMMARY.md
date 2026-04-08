---
phase: 02-dns-tls-edge-readiness
plan: 02
subsystem: infra
tags: [dns, tls, dig, openssl, operations]
requires:
  - phase: 02-dns-tls-edge-readiness
    provides: Route53/ACM Terraform resources and DNS outputs from 02-01
provides:
  - DNS delegation + propagation readiness script with bounded retry and timeout exit
  - TLS readiness script for apex, wildcard sample, and API with strict all-or-nothing verdict
affects: [02-03, operations-runbook, smoke-verification]
tech-stack:
  added: []
  patterns:
    - CLI-first DNS/TLS readiness evidence with explicit PASS/FAIL lines
    - Time-bounded retry loops with actionable resume commands on timeout
key-files:
  created:
    - infrastructure/scripts/dns-delegation-check.sh
    - infrastructure/scripts/tls-readiness-check.sh
  modified: []
key-decisions:
  - "DNS checker accepts --expected-ns override when Terraform output/state is temporarily unavailable."
  - "TLS readiness uses OpenSSL SNI + hostname verification and fails the full run if any domain class fails."
patterns-established:
  - "Propagation wait state is surfaced as blocked-waiting-for-delegation until all DNS checks pass or timeout is reached."
  - "Three fixed TLS domain classes (apex/wildcard/api) are always evaluated together with one overall verdict."
requirements-completed: [INFRA-02, INFRA-03, INFRA-04, INFRA-05]
duration: 4min
completed: 2026-04-09
---

# Phase 2 Plan 02: DNS and TLS Readiness Script Summary

**CLI readiness scripts now provide deterministic delegation/DNS and TLS evidence for `matchcota.tech`, wildcard sample host, and `api.matchcota.tech` with bounded retries and resume guidance.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-08T22:33:05Z
- **Completed:** 2026-04-08T22:37:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- Added `dns-delegation-check.sh` with required domain arguments, input validation, bounded retries, and `blocked-waiting-for-delegation` status output.
- Added `tls-readiness-check.sh` that checks exactly apex/wildcard/api TLS handshakes and enforces strict all-domain pass behavior.
- Both scripts now fail fast on timeout with explicit resume commands for operator re-run.

## Task Commits

1. **Task 1: Create delegation and DNS propagation check script** - `17dacd4` (feat)
2. **Task 2: Create TLS readiness check script for apex/wildcard/API** - `184a79d` (feat)

## Files Created/Modified
- `infrastructure/scripts/dns-delegation-check.sh` - Delegation + DNS propagation verification with deterministic timeout behavior.
- `infrastructure/scripts/tls-readiness-check.sh` - TLS hostname/certificate verification for three required domain classes.

## Verification Evidence
- `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample demo.matchcota.tech --api-host api.matchcota.tech --timeout 60 --interval 10`
  - Produced repeated `blocked-waiting-for-delegation` status and exited on timeout with resume instructions.
- `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample demo.matchcota.tech --api api.matchcota.tech --timeout 60 --interval 10`
  - Produced per-domain FAIL statuses and timed out with explicit resume instructions.

## Decisions Made
- Kept DNS expected nameserver source tied to Terraform output by default, but added `--expected-ns` override for environments where state/output is not yet readable.
- Used OpenSSL hostname verification (`-verify_hostname` + SNI) to prevent accepting spoofed/mismatched certificates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Terraform output might be unavailable before backend/state readiness**
- **Found during:** Task 1 verification
- **Issue:** Initial implementation hard-failed early when `terraform output route53_hosted_zone_name_servers` was unreadable due to backend/state readiness.
- **Fix:** Added resilient behavior: optional `--expected-ns` input, non-crashing output parsing, and continued bounded retry loop with explicit guidance.
- **Files modified:** `infrastructure/scripts/dns-delegation-check.sh`
- **Verification:** Script now prints blocked status/retry guidance and exits deterministically on timeout rather than crashing.
- **Committed in:** `17dacd4`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep; change was required for robust execution in realistic pre-propagation/pre-state windows.

## Known Stubs
None.

## Issues Encountered
- DNS and TLS verification targets are not yet live in this environment, so both verification runs correctly exercised timeout + resume behavior rather than pass paths.

## Next Phase Readiness
- Plan 02-03 can integrate these scripts into smoke/runbook flow for operator checkpoints.
- Scripts are executable and produce audit-friendly, timestamped evidence output for DNS/TLS readiness gates.

## Self-Check: PASSED

- FOUND: `infrastructure/scripts/dns-delegation-check.sh`
- FOUND: `infrastructure/scripts/tls-readiness-check.sh`
- FOUND commit: `17dacd4`
- FOUND commit: `184a79d`
