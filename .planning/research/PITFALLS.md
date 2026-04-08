# Pitfalls Research

**Domain:** AWS production migration for a multi-tenant FastAPI + React monorepo (Lambda API + EC2 static frontend + wildcard tenant DNS) under AWS Academy constraints  
**Researched:** 2026-04-08  
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: “Successful signup” without usable tenant access

**What goes wrong:**
Tenant registration returns 201, but the shelter cannot log in because bootstrap admin creation fails, tenant context resolves incorrectly, or signup does not complete atomically.

**Why it happens:**
- Tenant onboarding is split across loosely-coupled steps (tenant row, admin row, auth setup).
- Existing codebase concern already flags missing bootstrap admin behavior.
- Teams trust frontend success state instead of server-side completion invariants.

**How to avoid:**
- Implement **single transaction onboarding contract**: `create tenant + create initial admin + hash password + emit audit event` in one DB transaction.
- Return success only when all onboarding invariants are true.
- Add idempotency key (or deterministic conflict handling) to prevent double-submits creating half-state.
- Enforce tenant resolution from validated host/domain mapping, not client-forged tenant headers.
- Add mandatory E2E onboarding test in production-like environment.

**Warning signs:**
- Tenant exists in DB but no admin user for same `tenant_id`.
- `/auth/login` fails for newly registered shelter despite successful registration response.
- Support workaround requires manual SQL/admin creation.
- Spike in “register succeeded but cannot access admin” reports.

**Phase to address:**
**Phase 3 — Onboarding Transaction + Tenant Trust Boundary**

**Recovery action if pitfall occurs:**
1. Freeze new registrations temporarily (feature flag / maintenance toggle).
2. Run reconciliation script to detect tenants missing bootstrap admins.
3. Backfill missing admins through audited recovery command (never ad-hoc SQL in console).
4. Deploy transactional onboarding patch and replay failed registrations idempotently.

---

### Pitfall 2: DNS / certificate drift breaks wildcard tenant routing

**What goes wrong:**
`{slug}.matchcota.tech` intermittently fails DNS resolution or TLS validation due to registrar delegation mismatch, stale Route 53 records, incomplete ACM validation records, or accidental cert/domain mismatch.

**Why it happens:**
- Domain is at third-party registrar (DotTech) while DNS is in Route 53; delegation step is manual and easy to drift.
- Teams rotate/recreate hosted zones but forget NS updates at registrar.
- Cert setup done once manually, not codified or verified post-apply.

**How to avoid:**
- Treat delegation + wildcard records + ACM validation CNAMEs as **cutover checklist with blocking gates**.
- Keep wildcard strategy (`*.matchcota.tech`) and remove runtime per-tenant Route 53 mutation from request path.
- Add post-deploy DNS/TLS verification script:
  - apex resolves
  - wildcard tenant hostname resolves
  - `api.matchcota.tech` resolves
  - cert chain valid for expected SANs
- Centralize domain values in Terraform variables; no hardcoded domain defaults in app code.

**Warning signs:**
- `Pending validation` or `Validation timed out` ACM statuses.
- Some tenants resolve, others NXDOMAIN/SERVFAIL.
- Browser shows cert mismatch on tenant subdomains.
- `dig NS matchcota.tech` differs from Route 53 hosted zone delegation.

**Phase to address:**
**Phase 2 — DNS/TLS Foundation and Domain Delegation Control**

**Recovery action if pitfall occurs:**
1. Stop tenant launch announcements and publish incident status.
2. Reconcile registrar NS with active Route 53 hosted zone.
3. Recreate/repair ACM validation records and wait for issuance.
4. Re-run DNS/TLS smoke matrix before reopening onboarding.

---

### Pitfall 3: Lambda-to-RDS connection storms exhaust PostgreSQL connections

**What goes wrong:**
Traffic burst causes Lambda concurrency spike, creating too many DB connections; RDS hits max connections, causing API timeouts and cascading failures.

**Why it happens:**
- Container-era DB pooling assumptions carried into Lambda runtime.
- No RDS Proxy and no concurrency cap.
- Connection lifecycle not optimized for serverless (new connection per invoke).

**How to avoid:**
- Use **RDS Proxy** for production Lambda DB access (AWS explicitly recommends proxy for frequent short connections).
- Configure Lambda **reserved concurrency** to protect DB.
- Reuse DB clients/connections outside handler when possible; configure SQLAlchemy engine for Lambda-safe behavior.
- Load-test onboarding + matching endpoints with realistic concurrency before production cutover.
- Add fail-fast behavior for DB saturation (clear error, retry/backoff, no hanging requests).

**Warning signs:**
- Sudden increase in DB connection count near max.
- Elevated API latency/timeouts during moderate traffic.
- Intermittent auth/matching failures under bursts.
- Throttling or spike in Lambda duration concurrent with DB errors.

**Phase to address:**
**Phase 4 — Lambda Runtime Hardening + DB Capacity Guardrails**

**Recovery action if pitfall occurs:**
1. Immediately reduce Lambda pressure (lower reserved concurrency or temporary 429 on hot endpoints).
2. Enable/fix RDS Proxy path and redeploy with safe connection settings.
3. Restart unhealthy DB clients and clear stuck connections.
4. Re-run load test and only then restore normal concurrency.

---

### Pitfall 4: Lab-session credential expiry corrupts deployment flow

**What goes wrong:**
AWS Academy temporary credentials expire mid-`terraform apply`, leaving partial infrastructure and inconsistent state between AWS resources and Terraform state.

**Why it happens:**
- STS credentials are short-lived and non-refreshable for the current session.
- Long apply runs + manual pauses + re-auth delays.
- Teams run apply without resumable workflow or state lock discipline.

**How to avoid:**
- Run Terraform with remote backend + lock support and short, ordered apply steps.
- Break deployment into bounded layers (network, data, compute, DNS) with explicit checkpoints.
- Pre-flight credential TTL check before each apply batch.
- Always use saved plan where practical; never bypass lock with `-lock=false`.
- Document resume runbook: refresh creds -> re-init -> verify state -> re-apply.

**Warning signs:**
- `ExpiredToken` / `The security token included in the request is expired` during apply.
- Interrupted apply followed by drift plan showing unexpected creates/destroys.
- Manual console edits appear because team attempts quick fixes after expiry.

**Phase to address:**
**Phase 1 — Terraform Operating Model for Academy Sessions**

**Recovery action if pitfall occurs:**
1. Stop manual infra changes immediately.
2. Refresh lab credentials and re-run `terraform init`.
3. Verify lock/state health (unlock only if own stale lock is confirmed).
4. Re-run `plan`, inspect drift, then apply from known checkpoint module.

---

### Pitfall 5: Academy restrictions silently invalidate “standard AWS” guidance

**What goes wrong:**
Team plans production controls (CloudFront/SES/CloudWatch-heavy pipelines/NAT-heavy topology/Multi-AZ DB) that are blocked or budget-incompatible in the Academy account, causing repeated redesign and delays.

**Why it happens:**
- Teams copy reference architectures without filtering for academy IAM/service limits.
- Cost assumptions ignore hard cap and idle resource burn.

**How to avoid:**
- Define and enforce an **allowed-services matrix** in Terraform + docs.
- Add policy checks in review: reject resources outside Academy scope.
- Use budget-aware architecture defaults already decided in PROJECT scope (single-AZ DB, no NAT gateway, no CloudFront/SES dependence).
- Create explicit “deferred enterprise controls” backlog instead of sneaking them into MVP.

**Warning signs:**
- Repeated IAM access denied on unsupported services.
- Terraform plans keep reintroducing forbidden resources.
- Estimated monthly run cost trends above budget cap.

**Phase to address:**
**Phase 1 — Scope & Cost Guardrails**

**Recovery action if pitfall occurs:**
1. Roll back unsupported resources from IaC.
2. Re-baseline architecture to approved services.
3. Recalculate monthly cost and gate merges on budget check.
4. Move blocked capabilities to post-Academy milestone.

---

### Pitfall 6: Tenant isolation bypass via host/header trust confusion

**What goes wrong:**
Cross-tenant access risk emerges because tenant identification uses inconsistent host parsing, forwarded headers, and/or client-supplied tenant fields.

**Why it happens:**
- Dev/test shortcuts survive migration.
- No edge contract specifying which headers are trusted in production.
- Missing negative tests for tenant mismatch invariants.

**How to avoid:**
- Define strict trusted-host contract at API Gateway/edge.
- Ignore or reject client-provided tenant identity headers for authorization decisions.
- Ensure JWT tenant claim must match middleware-resolved tenant.
- Add integration tests for cross-tenant denial paths (must fail).

**Warning signs:**
- Same token can access resources under different hostnames.
- Tenant mismatch checks behave differently by route.
- Security review finds path exceptions tied to brittle middleware allowlists.

**Phase to address:**
**Phase 3 — Onboarding Transaction + Tenant Trust Boundary**

**Recovery action if pitfall occurs:**
1. Disable vulnerable endpoints or enforce temporary strict tenant check middleware globally.
2. Rotate impacted credentials/tokens.
3. Patch trusted-header policy and deploy comprehensive tenant-isolation tests.
4. Audit access logs for cross-tenant reads/writes and notify impacted tenants.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Manual console DNS/cert fixes | Fast unblock during incident | Drift + repeat outages | Only emergency; must back-port to Terraform same day |
| Keeping runtime Route53 mutation in signup | “Automatic” tenant DNS illusion | Partial onboarding failures and IAM fragility | Never in this project scope |
| Unbounded Lambda concurrency | Works in low traffic demos | DB exhaustion and cascading API failures | Never for production |
| Single giant `terraform apply` in lab sessions | Simpler command habit | High failure rate on credential expiry | Never; split by layers/checkpoints |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Route 53 + external registrar | Hosted zone created but registrar NS not updated or later drifted | Maintain registrar delegation checklist + periodic NS drift verification |
| ACM + wildcard domains | Cert requested but CNAME validation incomplete/mis-entered | Use DNS validation CNAMEs correctly, verify issuance before cutover |
| API Gateway custom domain | Custom domain configured but default execute-api endpoint left active | Disable default endpoint and redeploy stage after custom domain is live |
| Lambda + RDS | Direct per-invocation DB connect under burst traffic | Use RDS Proxy + reserved concurrency + connection reuse strategy |
| Lambda in VPC | Assume public subnet gives internet access | Use correct VPC routing design; verify private connectivity to RDS/S3 paths |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| DB connection per invoke | Rising latency and `too many connections` | RDS Proxy + Lambda concurrency limit | Usually first burst/event day |
| No concurrency guardrails | Downstream collapse during spikes | Reserved concurrency + endpoint-level throttling | Moderate traffic spikes |
| Cold start + VPC ENI churn ignored | Random first-request failures after idle windows | Keep-alive strategy + warm-path checks + retry budget | After idle periods / burst resumes |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client tenant headers | Cross-tenant data exposure | Resolve tenant from trusted host mapping only |
| Public tenant signup without abuse controls | Tenant spam/squatting/resource burn | Add rate limiting + challenge + slug policy + audit logging |
| Long-lived JWT without robust revocation model | Session replay after token theft | Shorter TTL, refresh rotation strategy, secure storage policy |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| “Tenant created” success before DNS/TLS/app ready | Shelter perceives platform as broken | Return onboarding status with clear readiness checkpoints |
| Generic onboarding error messages | Support burden and repeated failed retries | Return deterministic actionable errors (slug conflict, admin bootstrap failed, tenant unresolved) |
| Login form detached from tenant context | Valid credentials appear invalid | Always derive tenant context from hostname and surface it in UI |

## "Looks Done But Isn't" Checklist

- [ ] **Wildcard tenant DNS:** not done until registrar NS, wildcard record, and real tenant host resolution all pass.
- [ ] **TLS ready:** not done until ACM cert is issued and browser/API handshake succeeds for apex + wildcard + API domains.
- [ ] **Tenant onboarding:** not done until tenant can register, login, and open admin dashboard without manual intervention.
- [ ] **Lambda readiness:** not done until burst test confirms no DB connection exhaustion.
- [ ] **Terraform reliability:** not done until interrupted apply recovery is practiced with expired credentials scenario.
- [ ] **Academy compliance:** not done until unsupported services are absent from IaC and cost envelope is within cap.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Broken onboarding atomicity | MEDIUM | Freeze signup, reconcile missing admins, deploy transactional fix, replay failed requests |
| DNS/cert drift outage | MEDIUM | Reconcile NS delegation, fix validation records, verify cert issuance, rerun DNS/TLS matrix |
| Lambda DB exhaustion | HIGH | Constrain concurrency immediately, enable/fix proxy path, retest under load before reopening |
| Credential expiry during apply | LOW/MEDIUM | Refresh creds, verify lock/state, re-plan, resume from checkpoint module |
| Tenant isolation regression | HIGH | Disable vulnerable paths, patch trust boundary, rotate tokens, audit potential impact |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Credential expiry / Terraform interruption | Phase 1 — Terraform Operating Model for Academy Sessions | Simulated expired-token recovery drill succeeds without manual drift fixes |
| Academy service/budget traps | Phase 1 — Scope & Cost Guardrails | Terraform plan contains only allowed services; monthly estimate within cap |
| DNS/certificate drift | Phase 2 — DNS/TLS Foundation and Domain Delegation Control | Automated DNS/TLS smoke checks pass for apex/wildcard/API domains |
| Onboarding non-atomic failures | Phase 3 — Onboarding Transaction + Tenant Trust Boundary | E2E test: register -> login -> admin access with zero manual steps |
| Tenant trust-boundary bypass | Phase 3 — Onboarding Transaction + Tenant Trust Boundary | Cross-tenant negative tests consistently return deny responses |
| Lambda DB connection exhaustion | Phase 4 — Lambda Runtime Hardening + DB Capacity Guardrails | Load test shows stable p95 and no DB max-connection incidents under target burst |

## Sources

### Internal project evidence
- `.planning/PROJECT.md` (scope, architecture lock, academy constraints) — **HIGH**
- `.planning/codebase/CONCERNS.md` (current bugs/security/deploy risks) — **HIGH**
- `.planning/codebase/TESTING.md` (test gaps on tenant flow and prod readiness) — **HIGH**
- `.planning/codebase/INTEGRATIONS.md` (current integration gaps and assumptions) — **HIGH**

### Official AWS / Terraform docs
- AWS Lambda best practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html — **HIGH**
- AWS Lambda with RDS (proxy recommendation): https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html — **HIGH**
- Amazon RDS Proxy docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html — **HIGH**
- Lambda reserved concurrency: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html — **HIGH**
- Lambda VPC behavior/limits: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html — **HIGH**
- API Gateway custom domains + wildcard considerations: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html — **HIGH**
- Disable API Gateway default endpoint: https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-disable-default-endpoint.html — **HIGH**
- ACM DNS validation behavior/timeouts: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html — **HIGH**
- Route 53 nameserver/delegation warnings: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-name-servers-glue-records.html — **HIGH**
- IAM temporary credentials expiration model: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html — **HIGH**
- Terraform state locking: https://developer.hashicorp.com/terraform/language/state/locking — **HIGH**
- Terraform apply operational behavior: https://developer.hashicorp.com/terraform/cli/commands/apply — **HIGH**

---
*Pitfalls research for: MatchCota AWS production deployment migration*
*Researched: 2026-04-08*
