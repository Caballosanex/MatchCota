# Feature Research

**Domain:** Production deployment capabilities for an existing multi-tenant SaaS (MatchCota) on AWS Academy
**Researched:** 2026-04-08
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = launch fails or trust breaks.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wildcard DNS + TLS correctly wired (`matchcota.tech`, `*.matchcota.tech`, `api.matchcota.tech`) | Shelter expects immediate working URL and HTTPS lock icon | MEDIUM | Use Route 53 wildcard records + ACM certs; remember ACM wildcard covers one level only; include apex separately. |
| Atomic tenant onboarding with immediate admin access | Core value is “register once, log in now” | HIGH | Tenant + initial admin user + credential issuance must succeed/fail together in one transaction boundary. |
| Trusted tenant resolution from hostname (not client-forged headers) | Multi-tenant SaaS must prevent cross-tenant mistakes | HIGH | Enforce edge contract (`Host`/forwarded host validation), deprecate client-controlled tenant identity headers for auth decisions. |
| Production security baseline for public onboarding | Public signup endpoints are abuse targets on day 1 | MEDIUM | Rate limit + challenge/CAPTCHA + slug policy + audit trail; lock CORS and JWT settings for production defaults. |
| Data safety baseline (backups + migration discipline + restore test) | Production SaaS must survive operator error and bad deploys | MEDIUM | RDS automated backups/snapshots, pre-deploy migration check, rollback runbook, verified restore at least once pre-launch. |
| Reproducible infrastructure + deploy runbooks under expiring lab credentials | School-lab sessions reset/expire; manual steps drift | MEDIUM | Terraform idempotency, resumable apply steps, explicit “where to restart safely” instructions. |
| End-to-end production verification for onboarding flow | Deployment is not done until shelter onboarding is proven live | LOW | Scripted smoke flow: register tenant -> resolve `{slug}.matchcota.tech` -> login -> admin dashboard reachable. |

### Differentiators (Competitive Advantage)

Features that improve launch quality and operational confidence beyond minimum.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Onboarding readiness SLA target (e.g., “new shelter ready in <60s”) with explicit status checks | Turns “it should work” into measurable reliability promise | MEDIUM | Track DNS/TLS/app readiness checkpoints and return actionable failure reasons. |
| Self-serve anti-abuse onboarding policy (invite code or approval queue toggle) | Preserves instant onboarding while controlling spam/squatting bursts | MEDIUM | Feature flag: open signup for demo days, moderated mode for stability. |
| Post-deploy one-command verification bundle | Reduces operator error and shortens recovery during lab resets | LOW | Bundle DNS checks, TLS checks, API health, tenant creation/login checks into single command/report. |
| Tenant bootstrap observability artifact (structured onboarding event log) | Faster debugging when onboarding partially fails | MEDIUM | Even without full CloudWatch pipeline, persist minimal onboarding outcome records in DB/table for supportability. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem helpful now but are high-risk for this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Runtime per-tenant Route 53 mutation during signup | Feels like “fully automated DNS onboarding” | Couples infra mutation to request path; brittle with lab IAM limits; causes partial onboarding failures | Pre-provision wildcard DNS/certs once; onboarding is app-level only |
| Full CI/CD, blue/green, and advanced deployment orchestration now | “Production should be fully automated” | High setup cost under temporary credentials; delays core onboarding reliability goal | Idempotent Terraform + manual gated runbook + smoke verification |
| Multi-AZ RDS + NAT + full observability stack in this lab milestone | “Enterprise best practice” instinct | Violates budget/academy constraints; risks non-delivery of core value | Single-AZ + strict backup/restore discipline + lightweight health checks |
| Broad auth/platform expansion (SSO, complex RBAC redesign) | Security hardening pressure | Scope explosion unrelated to immediate onboarding path | Keep current auth model, tighten TTL/baseline controls, defer major auth redesign |

## Feature Dependencies

```
Wildcard DNS + TLS
    └──requires──> Domain delegation to Route 53 + ACM DNS validation

Atomic tenant onboarding + immediate admin access
    └──requires──> Trusted tenant resolution + DB transaction boundaries
                       └──requires──> Production-safe migration + uniqueness constraints

Production security baseline
    └──requires──> Edge policy (host validation, HTTPS-only, rate limits)

E2E onboarding verification
    └──requires──> Deployed infra + onboarding endpoint + admin login flow

Runtime Route53 mutation ──conflicts──> Instant reliable onboarding under lab IAM constraints
```

### Dependency Notes

- **Wildcard DNS + TLS requires Route 53 delegation and ACM validation:** without both, tenant URLs may resolve inconsistently or fail HTTPS.
- **Atomic onboarding requires transaction discipline:** tenant row without admin row (or vice versa) breaks “instant access” promise.
- **Security baseline requires trusted host contract:** tenant isolation cannot depend on client-supplied tenant headers.
- **Verification depends on live infra:** onboarding is only “done” after real subdomain + login works in production.
- **Runtime DNS mutation conflicts with reliability goal:** infra side effects in signup path are the highest-risk source of partial failures.

## MVP Definition

### Launch With (v1)

- [ ] Wildcard DNS/TLS fully operational for apex + tenant + API domains — core routing trust boundary.
- [ ] Atomic tenant registration that creates initial admin credentials immediately — core value delivery.
- [ ] Production baseline security controls on onboarding/auth paths — abuse and isolation risk reduction.
- [ ] Data safety baseline (automated backups + restore drill + migration runbook) — prevents irreversible launch mistakes.
- [ ] Reproducible Terraform + deploy runbook + E2E onboarding smoke test — operational repeatability in lab resets.

### Add After Validation (v1.x)

- [ ] Onboarding readiness SLA measurement/report — add once baseline onboarding is stable for multiple tenants.
- [ ] Moderated onboarding mode (invite/approval toggle) — add when spam/squatting signals appear.
- [ ] Structured onboarding diagnostics dashboard/report — add when support volume increases.

### Future Consideration (v2+)

- [ ] Full CI/CD with staged rollouts and automated rollback — defer until stable non-lab AWS account and persistent IAM are available.
- [ ] Expanded observability platform and advanced alerting — defer until service restrictions and budget constraints are removed.
- [ ] Major auth redesign (refresh-token rotation, SSO, advanced RBAC) — defer until post-launch usage patterns justify complexity.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wildcard DNS + TLS correctness | HIGH | MEDIUM | P1 |
| Atomic onboarding + immediate admin access | HIGH | HIGH | P1 |
| Trusted tenant resolution + security baseline | HIGH | MEDIUM | P1 |
| Data safety baseline (backup/restore/migration discipline) | HIGH | MEDIUM | P1 |
| E2E onboarding verification automation | HIGH | LOW | P1 |
| Onboarding SLA/status instrumentation | MEDIUM | MEDIUM | P2 |
| Moderated onboarding policy toggle | MEDIUM | MEDIUM | P2 |
| Advanced CI/CD + blue/green | MEDIUM | HIGH | P3 |
| Multi-AZ + NAT + full observability stack (lab) | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Typical small SaaS launch | Enterprise SaaS baseline | Our Approach |
|---------|---------------------------|--------------------------|--------------|
| Tenant subdomain onboarding | Wildcard DNS + app-level provisioning | Dedicated onboarding pipelines + internal tooling | Wildcard DNS + atomic app onboarding (no runtime DNS mutation) |
| Deployment reliability | Runbook + smoke tests | Full CI/CD, canary/blue-green, deep observability | Runbook + reproducible Terraform + mandatory E2E onboarding verification |
| Security at signup | Rate limit + basic challenge | Advanced fraud detection + centralized IAM controls | Baseline anti-abuse + trusted host contract + tenant-bound auth checks |

## Sources

- Internal project scope and constraints: `.planning/PROJECT.md` (2026-04-08)
- Internal architecture state: `.planning/codebase/ARCHITECTURE.md` (2026-04-08)
- Internal risk inventory: `.planning/codebase/CONCERNS.md` (2026-04-08)
- AWS Route 53 wildcard behavior and precedence: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DomainNameFormat.html (official)
- AWS ACM wildcard certificate limits: https://docs.aws.amazon.com/acm/latest/userguide/acm-certificate-characteristics.html (official)
- API Gateway wildcard custom domain behavior: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html (official)
- AWS Lambda operational best practices (idempotency, scaling, config): https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html (official)

---
*Feature research for: MatchCota AWS production deployment*
*Researched: 2026-04-08*
