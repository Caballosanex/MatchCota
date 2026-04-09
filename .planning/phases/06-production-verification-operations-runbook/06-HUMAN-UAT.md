---
status: pending
phase: 06-production-verification-operations-runbook
source: [06-02-PLAN.md]
started: 
updated: 2026-04-09T18:03:27Z
---

# Phase 06 Human UAT — Launch Readiness Evidence

Use this artifact to record real owner-run launch verification on production domains.

## Rules (must follow)

- Use real production flow only: `https://matchcota.tech/register-tenant`.
- Use a unique real shelter slug/email/password for this run.
- **Do not use fixture/demo identities, fixture slugs, or seeded credentials.**
- Record timestamps, exact URL outcomes, and pass/fail notes per step.

## Test Session Metadata

- **Owner/Operator:**
- **Date (UTC):**
- **Browser + version:**
- **AWS profile used for scripts:** `matchcota`
- **Region:** `us-east-1`
- **Shelter name used:**
- **Shelter slug used:**
- **Shelter email used:**

## Owner Launch Checklist (register → subdomain → login)

### A) Open production registration URL
- URL opened: `https://matchcota.tech/register-tenant`
- Timestamp (UTC):
- Result: [ ] pass [ ] fail
- Evidence / notes:

### B) Register real shelter
- Input used:
  - Shelter name:
  - Slug:
  - Email:
  - Password length (>=8):
- Timestamp (UTC):
- Result: [ ] pass [ ] fail
- Evidence / notes:

### C) Confirm redirect to tenant login domain
- Expected URL: `https://{slug}.matchcota.tech/login`
- Actual URL observed:
- Timestamp (UTC):
- Result: [ ] pass [ ] fail
- Evidence / notes:

### D) Log in with just-created credentials
- Login URL used:
- Email used:
- Timestamp (UTC):
- Result: [ ] pass [ ] fail
- Evidence / notes:

## Operational Evidence (required)

### E) `post-deploy-readiness.sh` output record
- Command run:

  ```bash
  AWS_PROFILE=matchcota bash infrastructure/scripts/post-deploy-readiness.sh
  ```

- Timestamp (UTC):
- Result: [ ] pass [ ] fail
- Output summary:

### F) `production-data-audit.sh` output record
- Command run:

  ```bash
  AWS_PROFILE=matchcota bash infrastructure/scripts/production-data-audit.sh
  ```

- Timestamp (UTC):
- Result: [ ] pass [ ] fail
- Output summary:

## Pass/Fail Decision

- Overall decision: [ ] approved [ ] rejected
- Decision timestamp (UTC):
- Blocking issue IDs/links (if rejected):
- Notes for follow-up:
