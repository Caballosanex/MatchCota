# MatchCota AWS Production Deployment

## What This Is

AWS production deployment of MatchCota multi-tenant SaaS platform for animal shelter adoptions. This deployment makes the fully-developed application (matching algorithm, multi-tenancy, admin dashboard, public adoption flow) accessible at `matchcota.tech` with HTTPS via Let's Encrypt on EC2, serving multiple shelter subdomains from shared infrastructure (EC2, RDS, S3).

## Core Value

**Working HTTPS production environment at `matchcota.tech` and `*.matchcota.tech` before Sprint 6 deadline (April 6th).** If only one thing works, it must be: visitors can access the site securely, test the matching flow, and the first shelter (`protectora-pilot`) can manage animals.

## Requirements

### Validated

<!-- Existing MatchCota application capabilities (already built in previous sprints): -->

- ✓ Multi-tenant architecture with subdomain-based tenant detection — existing
- ✓ FastAPI backend with JWT auth, tenant middleware, CRUD endpoints — existing
- ✓ React frontend with Vite, Tailwind, tenant context — existing
- ✓ Matching algorithm (cosine similarity, 16-dimension vectors) — existing
- ✓ PostgreSQL database with Alembic migrations — existing
- ✓ S3 storage integration (ready for production) — existing
- ✓ Admin dashboard (animals, leads, settings) — existing
- ✓ Public flow (catalog, matching test, results, lead capture) — existing
- ✓ Tenant onboarding UI and API endpoint — existing

### Active

<!-- AWS deployment infrastructure and configuration (Sprint 6 deliverables): -->

- [x] AWS CLI configured with `matchcota` profile (lab session credentials) — Validated in Phase 01: dns-ssl-foundation
- [x] Route 53 hosted zone with NS delegation to DotTech registrar — Validated in Phase 01: dns-ssl-foundation (zone: Z068386214DXGZ36CDSRY)
- [x] ACM wildcard certificate (`*.matchcota.tech`) validated and ready — Validated in Phase 01: dns-ssl-foundation (status: ISSUED)
- [ ] Let's Encrypt SSL certificate for `matchcota.tech` via certbot
- [ ] nginx serving React frontend from local disk and handling SSL termination
- [ ] S3 bucket for image uploads (backend writes via IAM role)
- [x] VPC with public/private subnets and security groups — Validated in Phase 02: core-infrastructure (vpc-04c45afa110b08c25)
- [x] RDS PostgreSQL 15 (db.t3.micro) in private subnet — Validated in Phase 02: core-infrastructure (matchcota-db.c0fbgdrso9in.us-east-1.rds.amazonaws.com)
- [ ] EC2 instance (t3.micro) with Elastic IP running backend
- [ ] Nginx reverse proxy forwarding to uvicorn (systemd service)
- [ ] Backend deployed with production environment variables
- [ ] Database migrated to RDS with test data
- [ ] Route 53 A records: `matchcota.tech` and `*.matchcota.tech` → EC2 Elastic IP
- [ ] boto3 Route 53 integration for automated tenant subdomain creation
- [ ] Verification: `https://matchcota.tech` loads landing page
- [ ] Verification: `https://protectora-pilot.matchcota.tech` fully functional

### Out of Scope

- Docker in production (use native Python + systemd) — wrong approach for EC2
- Lambda for tenant onboarding (existing API endpoint handles it) — unnecessary complexity
- Multi-AZ RDS (exceeds $50 budget) — budget constraint
- NAT Gateway (use public EC2) — budget constraint
- CloudWatch advanced monitoring (basic only) — MVP simplification
- Automated CI/CD via GitHub Actions (manual deployment for Sprint 6) — time constraint
- CloudFront CDN (AWS Academy Lab accounts lack CloudFront IAM permissions) — IAM constraint
- Wildcard SSL certificates (Let's Encrypt requires individual certs per subdomain) — Let's Encrypt limitation
- SES email service (blocked in lab accounts, defer to Sprint 7) — technical limitation
- Redis caching layer (optional for MVP) — MVP simplification

## Context

**Project Background:**
- School project (Sprint 6 of 8, focus: AWS infrastructure)
- Team: ASIX (infra), DAW1 (backend), DAW2 (frontend)
- Previous sprints completed: app development, matching algorithm, multi-tenancy
- This is the infrastructure sprint - make existing app production-ready

**AWS Environment:**
- Lab account with session tokens (may expire, need refresh)
- Account ID: 788602800812
- IAM role creation restricted - use existing `LabRole`
- Region: us-east-1 (required for ACM with CloudFront)
- Budget: $50 maximum (controls instance sizes)

**Domain Setup:**
- Domain: `matchcota.tech` (free .tech domain from DotTech)
- Cannot transfer domain - must use NS delegation to Route 53
- DNS propagation required for ACM validation (15min-48hrs)

**Architecture Rationale:**
- Let's Encrypt SSL on EC2 with nginx (free, 90-day renewal via cron job)
- Individual Route 53 A records per tenant (automated via boto3 when tenant created)
- nginx serves frontend from local disk and reverse proxies API to uvicorn
- EC2 terminates SSL directly (no CloudFront due to AWS Academy IAM restrictions)
- All tenants share resources (isolation via `tenant_id` in database)
- No Docker in prod (systemd + native Python faster for single instance)

**Technical Debt to Address:**
- Backend needs S3_BASE_URL config for direct S3 image URLs
- Production .env template needs creation
- Deploy scripts need to be written (none exist yet)
- certbot auto-renewal needs monitoring/alerting setup
- Route 53 DNS automation needs error handling for duplicate records

## Constraints

- **Budget**: $50 maximum — Forces t3.micro (EC2), db.t3.micro (RDS), no multi-AZ, no NAT
- **Timeline**: Sprint 6 ends April 6th — ~12 days for complete deployment
- **DNS**: matchcota.tech at DotTech registrar — Cannot transfer, must use NS delegation
- **ACM**: Free wildcard cert non-exportable — Cannot use (requires CloudFront)
- **IAM**: Lab account with restricted permissions — No CloudFront access, use existing LabRole for EC2/S3/RDS
- **Session**: Temporary AWS credentials — May need refresh mid-sprint
- **Region**: us-east-1 required — ACM certs for CloudFront must be in us-east-1
- **Git**: Public repository — No private credentials in code, deploy keys for EC2 access
- **Tech Stack**: No changes to app stack — Infrastructure only, app code is frozen

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ~~CloudFront terminates ALL SSL~~ **CHANGED** | ~~ACM certs non-exportable, can't install on EC2 - CloudFront is only option for free wildcard HTTPS~~ | ❌ Blocked by IAM |
| **Let's Encrypt SSL on EC2** | AWS Academy blocks CloudFront IAM permissions, Let's Encrypt is free alternative with certbot, 90-day renewal acceptable for MVP | ✅ Phase 3 revised |
| **Per-tenant Route 53 A records** | No wildcard SSL with Let's Encrypt, automate A record creation via boto3 when tenant onboards | ✅ Phase 4 implementation |
| EC2 with Elastic IP as origin | CloudFront needs stable endpoint, public IPs change on stop/start, Elastic IP is free while attached | — Pending |
| No Docker in production | Single-instance deployment, systemd + native Python simpler and faster, Docker adds complexity without benefit | — Pending |
| NS delegation vs transfer | DotTech domain cannot transfer out, Route 53 NS delegation achieves same result | — Pending |
| DNS/ACM first in timeline | ACM validation depends on DNS propagation (can take 15min-48hrs), must start early to avoid blocking CloudFront | — Pending |
| t3.micro instances | $50 budget constraint, sufficient for demo/school presentation workload | — Pending |
| No Lambda onboarding | Existing POST /api/v1/tenants/ endpoint handles tenant creation, wildcard DNS handles routing automatically | — Pending |
| SSH key local generation | Keep private key secure on developer machine, import public key to AWS, better security than AWS-generated key | — Pending |
| Terraform modular structure | Networking, compute, database, storage, DNS as separate modules, enables parallel development and testing | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after CloudFront → Let's Encrypt architecture change*
