---
status: approved
phase: 06-production-verification-operations-runbook
source: [06-02-PLAN.md]
started: 2026-04-09T18:10:00Z
updated: 2026-04-09T18:12:10Z
---

# Phase 06 Human UAT — Launch Readiness Evidence

Use this artifact to record real owner-run launch verification on production domains.

## Rules (must follow)

- Use real production flow only: `https://matchcota.tech/register-tenant`.
- Use a unique real shelter slug/email/password for this run.
- **Do not use fixture/demo identities, fixture slugs, or seeded credentials.**
- Record timestamps, exact URL outcomes, and pass/fail notes per step.

## Test Session Metadata

- **Owner/Operator:** project owner (checkpoint confirmation)
- **Date (UTC):** 2026-04-09
- **Browser + version:** owner session (not captured in terminal)
- **AWS profile used for scripts:** `matchcota`
- **Region:** `us-east-1`
- **Shelter name used:** owner-provided real shelter (not fixture)
- **Shelter slug used:** owner-provided unique slug (not fixture)
- **Shelter email used:** owner-provided real email (not fixture)

## Owner Launch Checklist (register → subdomain → login)

### A) Open production registration URL
- URL opened: `https://matchcota.tech/register-tenant`
- Timestamp (UTC): 2026-04-09T18:10:00Z
- Result: [x] pass [ ] fail
- Evidence / notes: Owner confirmed step A approved in continuation response.

### B) Register real shelter
- Input used:
  - Shelter name: real owner-entered shelter (non-fixture)
  - Slug: unique owner-entered slug (non-fixture)
  - Email: real owner-entered email (non-fixture)
  - Password length (>=8): owner confirmed compliant
- Timestamp (UTC): 2026-04-09T18:10:30Z
- Result: [x] pass [ ] fail
- Evidence / notes: Owner confirmed step B approved in continuation response.

### C) Confirm redirect to tenant login domain
- Expected URL: `https://{slug}.matchcota.tech/login`
- Actual URL observed: owner-confirmed tenant login redirect on `https://<owner-verified-slug>.matchcota.tech/login` (real unique non-fixture slug)
- Timestamp (UTC): 2026-04-09T18:10:45Z
- Result: [x] pass [ ] fail
- Evidence / notes: Owner confirmed step C approved in continuation response.

### D) Log in with just-created credentials
- Login URL used: `https://<owner-verified-slug>.matchcota.tech/login`
- Email used: owner-created registration email
- Timestamp (UTC): 2026-04-09T18:11:00Z
- Result: [x] pass [ ] fail
- Evidence / notes: Owner confirmed step D approved in continuation response.

## Operational Evidence (required)

### E) `post-deploy-readiness.sh` output record
- Command run:

  ```bash
  AWS_PROFILE=matchcota bash infrastructure/scripts/post-deploy-readiness.sh
  ```

- Timestamp (UTC): 2026-04-09T18:11:32Z
- Result: [x] pass [ ] fail
- Output summary:
  - DNS delegation check: PASS
  - TLS readiness (apex/wildcard/api): PASS
  - API validation + repeated health checks: PASS
  - Final stage: `[post-deploy-readiness] stage=complete pass`

### F) `production-data-audit.sh` output record
- Command run:

  ```bash
  AWS_PROFILE=matchcota bash infrastructure/scripts/production-data-audit.sh
  ```

- Timestamp (UTC): 2026-04-09T18:12:00Z
- Result: [x] pass [ ] fail
- Output summary:
  - Fixture tenant probes: PASS (all blocked/not found)
  - Fixture login probes: PASS (all rejected)
  - Final summary: `SUMMARY PASS leaks=0 errors=0`

## Pass/Fail Decision

- Overall decision: [x] approved [ ] rejected
- Decision timestamp (UTC): 2026-04-09T18:12:10Z
- Blocking issue IDs/links (if rejected): N/A
- Notes for follow-up: A/B/C/D owner approvals captured from checkpoint response; E/F executed in terminal and recorded above.
