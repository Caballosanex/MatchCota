# Requirements: MatchCota AWS Production Deployment

**Defined:** 2026-04-08
**Core Value:** A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

## v1 Requirements

Requirements for initial production launch. Each maps to exactly one roadmap phase.

### Infrastructure

- [x] **INFRA-01**: Operator can provision the full production stack from an empty AWS Academy Lab account using Terraform.
- [ ] **INFRA-02**: Operator can create Route 53 hosted zone for `matchcota.tech` and obtain nameserver values for DotTech delegation.
- [x] **INFRA-03**: Visitor can resolve `matchcota.tech` and `*.matchcota.tech` to the EC2 Elastic IP through Route 53 A records.
- [x] **INFRA-04**: API client can resolve `api.matchcota.tech` to API Gateway custom domain through Route 53 alias record.
- [x] **INFRA-05**: Browser and API clients can complete valid TLS handshakes for `matchcota.tech`, `*.matchcota.tech`, and `api.matchcota.tech`.
- [ ] **INFRA-06**: Operator can deploy VPC networking with 2 public subnets and 2 private subnets plus required route tables and internet gateway.
- [ ] **INFRA-07**: Lambda can run in private subnet and connect to RDS using security-group-only access control.
- [ ] **INFRA-08**: Operator can provision PostgreSQL 15 on `db.t3.micro` (single-AZ, 20GB, 7-day backups) in private subnet.
- [ ] **INFRA-09**: Backend can store and retrieve upload objects from private S3 bucket with block-public-access enabled.
- [ ] **INFRA-10**: Lambda can access S3 through VPC Gateway endpoint without requiring NAT Gateway.
- [ ] **INFRA-11**: EC2 `t3.micro` instance serves only built React static assets via nginx and does not run backend Python server.
- [ ] **INFRA-12**: API Gateway HTTP API routes production API traffic to Lambda backend through custom domain `api.matchcota.tech`.

### Backend Runtime

- [ ] **BACK-01**: Backend runtime includes `mangum` dependency and deployable Lambda entrypoint.
- [ ] **BACK-02**: Lambda handler file (`backend/app/lambda_handler.py`) exposes `handler = Mangum(app, lifespan="off")` and serves FastAPI routes correctly.
- [ ] **BACK-03**: Backend database configuration uses SQLAlchemy `NullPool` when `ENVIRONMENT=production` to prevent Lambda connection pool exhaustion.
- [ ] **BACK-04**: Production CORS allows `https://matchcota.tech` and wildcard tenant frontend origins while rejecting unrelated origins.
- [ ] **BACK-05**: Tenant registration flow removes runtime Route 53 mutation and relies on wildcard DNS architecture.

### Frontend Production Surface

- [ ] **FRONT-01**: Production frontend build excludes `frontend/src/pages/platform/DemoTest.jsx` and `/demo` route.
- [ ] **FRONT-02**: Production frontend build excludes `frontend/src/pages/public/RegisterAnimal.jsx` and `/register-animal` route.
- [ ] **FRONT-03**: Landing page excludes dev API health check UI, tenant list UI, demo CTA, and device-area diagnostics block.
- [ ] **FRONT-04**: Landing page footer uses `info@matchcota.tech` and year `2026`.
- [ ] **FRONT-05**: Frontend production environment file sets `VITE_API_URL=https://api.matchcota.tech`, `VITE_BASE_DOMAIN=matchcota.tech`, and `VITE_ENVIRONMENT=production`.

### Tenant Onboarding

- [ ] **ONBD-01**: Shelter registrant can set admin password and confirm password during registration with client validation (minimum 8 chars, fields must match).
- [ ] **ONBD-02**: Backend tenant creation schema accepts `admin_password` and validates it as required input.
- [ ] **ONBD-03**: Tenant registration creates tenant and first admin user atomically in one transaction.
- [ ] **ONBD-04**: Newly created admin user is linked to the new tenant, uses tenant email, and stores password as secure hash.
- [ ] **ONBD-05**: Successful registration message confirms active URL in format `{slug}.matchcota.tech` and tells user to log in with their email/password.
- [x] **ONBD-06**: New shelter can open `https://{slug}.matchcota.tech` immediately after registration and authenticate successfully.

### Security and Constraints

- [x] **SECU-01**: Deployment uses existing `LabRole` and `LabInstanceProfile` only, without creating custom IAM roles.
- [x] **SECU-02**: Production architecture excludes CloudFront, CloudWatch, SES, NAT Gateway, and Multi-AZ RDS.
- [x] **SECU-03**: Monthly infrastructure footprint remains within approximately $50 budget target.
- [x] **SECU-04**: Production deployment excludes seed and test fixture data; only real tenant records are used.
- [ ] **SECU-05**: Tenant-isolated backend queries remain tenant-scoped in production and prevent cross-tenant data access.

### Verification and Operations

- [x] **VERI-01**: Operator can rebuild environment from lab reset using documented Terraform sequence and resume safely after temporary credential expiry.
- [x] **VERI-02**: Operator can run post-deploy validation that confirms DNS + HTTPS readiness for apex, wildcard tenant, and API domains.
- [x] **VERI-03**: Project owner can create at least one real test shelter via `matchcota.tech` registration and complete register -> subdomain -> login flow.
- [x] **VERI-04**: Deployment docs include actionable runbook steps for infrastructure apply, frontend publish, backend publish, and smoke verification.

## v2 Requirements

Deferred to future release.

### Onboarding Reliability Enhancements

- **ONB2-01**: Operator can view onboarding readiness SLA metrics (target time from registration submit to successful subdomain login).
- **ONB2-02**: Operator can toggle moderated onboarding mode (invite/approval flow) without code changes.
- **ONB2-03**: Operator can run one-command automated verification suite that outputs pass/fail report artifacts.

### Platform Hardening (Post-Lab)

- **PLAT-01**: Team can introduce full CI/CD deployment automation with rollback strategy.
- **PLAT-02**: Team can adopt expanded observability stack once account restrictions are lifted.
- **PLAT-03**: Team can evaluate advanced auth hardening (refresh tokens, SSO, expanded RBAC) based on production usage.

## Out of Scope

Explicit exclusions for this milestone.

| Feature | Reason |
|---------|--------|
| CloudFront CDN | Blocked by AWS Academy Lab IAM restrictions |
| CloudWatch-based observability pipeline | Disabled/restricted in lab account |
| SES email notifications | SES blocked in lab account |
| Docker Compose as production runtime | Locked target uses EC2 nginx static frontend + Lambda backend |
| NAT Gateway egress pattern | Exceeds budget and unnecessary with S3 Gateway endpoint |
| Multi-AZ RDS | Exceeds budget for demo scope |
| CI/CD automation rollout | Deferred to keep focus on first working production deployment |
| Redis production caching | Not required to deliver core onboarding value |
| Runtime per-tenant Route 53 automation | Replaced by wildcard DNS design |
| Seed/test data onboarding in production | Production must use real tenant data only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Complete |
| INFRA-04 | Phase 02.1 | Complete |
| INFRA-05 | Phase 02.1 | Complete |
| INFRA-06 | Phase 3 | Pending |
| INFRA-07 | Phase 3 | Pending |
| INFRA-08 | Phase 3 | Pending |
| INFRA-09 | Phase 3 | Pending |
| INFRA-10 | Phase 3 | Pending |
| INFRA-11 | Phase 5 | Pending |
| INFRA-12 | Phase 4 | Pending |
| BACK-01 | Phase 4 | Pending |
| BACK-02 | Phase 4 | Pending |
| BACK-03 | Phase 4 | Pending |
| BACK-04 | Phase 4 | Pending |
| BACK-05 | Phase 4 | Pending |
| FRONT-01 | Phase 5 | Pending |
| FRONT-02 | Phase 5 | Pending |
| FRONT-03 | Phase 5 | Pending |
| FRONT-04 | Phase 5 | Pending |
| FRONT-05 | Phase 5 | Pending |
| ONBD-01 | Phase 5 | Pending |
| ONBD-02 | Phase 4 | Pending |
| ONBD-03 | Phase 4 | Pending |
| ONBD-04 | Phase 4 | Pending |
| ONBD-05 | Phase 5 | Pending |
| ONBD-06 | Phase 5 | Complete |
| SECU-01 | Phase 1 | Complete |
| SECU-02 | Phase 1 | Complete |
| SECU-03 | Phase 1 | Complete |
| SECU-04 | Phase 6 | Complete |
| SECU-05 | Phase 4 | Pending |
| VERI-01 | Phase 1 | Complete |
| VERI-02 | Phase 6 | Complete |
| VERI-03 | Phase 6 | Complete |
| VERI-04 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
