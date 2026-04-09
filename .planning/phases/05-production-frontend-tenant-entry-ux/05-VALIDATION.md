---
phase: 05
slug: production-frontend-tenant-entry-ux
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-09
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vite production build + ESLint script + targeted grep checks |
| **Config file** | `frontend/package.json` scripts (`build`, `lint`) |
| **Quick run command** | `npm run build` (in `frontend/`) |
| **Full suite command** | `npm run lint && npm run build` (in `frontend/`) |
| **Estimated runtime** | ~25-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` in `frontend/` (target: < 60s)
- **After every plan wave:** Run `npm run lint && npm run build` in `frontend/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | FRONT-01, FRONT-02, FRONT-03, FRONT-04 | T-05-01 | Demo/dev routes and diagnostics removed from production surface | static/build | `npm run build` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | FRONT-03, FRONT-04 | T-05-01 | Landing/Home/admin placeholders removed while `/test` flow remains | grep/build | `npm run lint && npm run build` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 1 | ONBD-01 | T-05-02 | Password min-length and confirm-match enforced client-side | behavior/build | `npm run build` | ✅ | ⬜ pending |
| 05-02-02 | 02 | 1 | ONBD-05, ONBD-06 | T-05-03 | Redirect-first handoff to deterministic tenant login URL | behavior/build | `npm run lint && npm run build` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | FRONT-05, ONBD-06 | T-05-04 | Production tenant resolution is host-only (no query fallback) | grep/build | `npm run build` | ✅ | ⬜ pending |
| 05-03-02 | 03 | 2 | FRONT-05 | T-05-04 | Production env contract points to API/base domain production values | grep/build | `npm run lint && npm run build` | ✅ | ⬜ pending |
| 05-04-01 | 04 | 3 | INFRA-11, ONBD-06 | T-05-05 | EC2 frontend remains static-only and tenant login path is reachable | script/manual | `bash infrastructure/scripts/deploy-frontend.sh --help` | ✅ | ⬜ pending |
| 05-04-02 | 04 | 3 | INFRA-11, ONBD-06 | T-05-10, T-05-11 | Validation artifact remains executable and Nyquist-compliant for production frontend verification loops | lint/build | `cd frontend && npm run lint && npm run build` | ✅ | ⬜ pending |
| 05-05-02 | 05 | 3 | ONBD-06 | T-05-13, T-05-14, T-05-15 | Lambda runtime env injected deterministically and onboarding API smoke validated in production | deploy/smoke | `AWS_PROFILE=matchcota AWS_REGION=us-east-1 DB_PASSWORD=<state> APP_SECRET_KEY=<env SECRET_KEY> JWT_SECRET_KEY=<env JWT_SECRET_KEY> bash infrastructure/scripts/deploy-backend.sh && AWS_PROFILE=matchcota AWS_REGION=us-east-1 aws lambda get-function-configuration --function-name "$(terraform -chdir=infrastructure/terraform/environments/prod output -raw lambda_function_name)" --query "Environment.Variables" --output json && curl -s -o /dev/null -w "%{http_code}" -X POST https://api.matchcota.tech/api/v1/tenants/ ... && curl -s -o /dev/null -w "%{http_code}" https://api.matchcota.tech/api/v1/tenants/current -H "X-Tenant-Slug: <slug>"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Registration handoff and immediate tenant login in browser | ONBD-06 | Requires live wildcard DNS + HTTPS and real browser navigation/auth flow | Register on apex, observe same-tab redirect to `https://{slug}.matchcota.tech/login`, authenticate with created credentials |
| Final phase checkpoint for live onboarding proof | ONBD-06 | Cannot be fully automated without human browser verification on live production domains | 1) Deploy with `infrastructure/scripts/deploy-frontend.sh` 2) Open `https://matchcota.tech/register-tenant` 3) Register shelter 4) Confirm redirect to `https://{slug}.matchcota.tech/login` 5) Login with created credentials |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execute/verify loops
