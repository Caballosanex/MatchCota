---
status: passed
phase: 01-fix-tenant-subdomain-frontend-routing-after-registration
source: [01-VERIFICATION.md]
started: 2026-04-09T20:52:14Z
updated: 2026-04-09T21:31:30Z
---

## Current Test

[all previously failing live checks re-run after deploy script edge-route contract hardening]

## Tests

### 1. Validate apex and tenant shell visual distinction in browser
expected: Apex host shows marketing shell; tenant host shows tenant-branded public shell
result: [pass] Re-verified after redeploy. Apex and tenant subdomain now render distinct shells in production (apex marketing shell retains registration CTA; tenant shell excludes apex registration CTA and marketing copy).

### 2. Run real production registration flow over HTTPS
expected: Register at apex and land on https://{slug}.matchcota.tech/ (not /login); fallback action also opens tenant root
result: [pass] Re-verified after redeploy. Registration handoff now lands on tenant root (`https://{slug}.matchcota.tech/`) and no longer lands on `/login`.

### 3. Execute post-deploy readiness with known tenant inputs in production
expected: frontend-route-readiness stage passes and blocks on host-routing regressions
result: [pass] Re-ran `KNOWN_TENANT_SLUG="shelter5" AWS_PROFILE="matchcota" bash infrastructure/scripts/post-deploy-readiness.sh`; `frontend-route-readiness` now passes and full readiness reaches `stage=complete pass`.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- None.
