# Roadmap: MatchCota AWS Production Deployment

**Created:** 2025-04-07
**Core Value:** Working HTTPS production environment at `matchcota.tech` and `*.matchcota.tech` before Sprint 6 deadline (April 6th)
**Granularity:** Coarse (3-5 phases)

## Phases

- [x] **Phase 1: DNS & SSL Foundation** - Route 53 hosted zone, NS delegation, ACM wildcard certificate (completed 2026-04-07)
- [x] **Phase 2: Core Infrastructure** - VPC networking, security groups, RDS PostgreSQL database (completed 2026-04-07)
- [x] **Phase 3: Storage Infrastructure** - S3 bucket for image uploads with IAM instance profile policy (completed 2026-04-08)
- [x] **Phase 4: Compute & Deployment** - ⚠️ SUPERSEDED — cloned dev repo to EC2, no Lambda, wrong architecture. EC2 and Route 53 records destroyed. Terraform state stale. See Phases 5-7.
- [ ] **Phase 5: Code Revision** - Remove all dev content from frontend, adapt backend for Lambda (Mangum), tenant registration creates admin user
- [ ] **Phase 6: Lambda + API Gateway** - Terraform Lambda function + API Gateway HTTP API at api.matchcota.tech, VPC S3 endpoint
- [ ] **Phase 7: EC2 Frontend + Verification** - Simplified EC2 (nginx only), Let's Encrypt wildcard, deploy built React app, full E2E verification

## Phase Details

### Phase 1: DNS & SSL Foundation
**Goal**: DNS delegation completed and ACM wildcard certificate validated, unblocking CloudFront deployment
**Depends on**: Nothing (critical path start)
**Requirements**: AWS-01, AWS-02, AWS-03, DNS-01, DNS-02, DNS-03, DNS-04, DNS-05
**Success Criteria** (what must be TRUE):
  1. AWS CLI profile `matchcota` configured with lab credentials and verified against account 788602800812
  2. SSH key pair generated locally and imported to AWS as `matchcota`
  3. Route 53 hosted zone created for `matchcota.tech` with NS records output
  4. NS delegation configured at DotTech registrar (manual step completed)
  5. ACM wildcard certificate for `*.matchcota.tech` and `matchcota.tech` validated via DNS
**Plans**: 3 plans in 2 waves
  - [x] 01-01-PLAN.md — AWS Foundation Setup (Wave 1) ✓ COMPLETE
  - [x] 01-02-PLAN.md — Terraform Infrastructure Foundation (Wave 1) - DNS & SSL modules
  - [x] 01-03-PLAN.md — Deploy Infrastructure & NS Delegation (Wave 2) - terraform apply + manual checkpoint

### Phase 2: Core Infrastructure
**Goal**: Network foundation and database operational, ready for application deployment
**Depends on**: Phase 1 (AWS credentials and region established)
**Requirements**: NET-01, NET-02, NET-03, NET-04, NET-05, NET-06, DB-01, DB-02, DB-03, DB-04, DB-05
**Success Criteria** (what must be TRUE):
  1. VPC created with public subnets (EC2) and private subnets (RDS), Internet Gateway attached
  2. Security groups configured: EC2 allows HTTP from CloudFront IPs + SSH from admin; RDS allows PostgreSQL from EC2 only
  3. RDS PostgreSQL 15 (db.t3.micro, 20GB, 7-day backups) operational in private subnet
  4. Database `matchcota` and user `matchcota` created with master password stored securely
  5. RDS endpoint accessible from VPC but not from public internet
**Plans**: 3 plans in 2 waves
  Plans:
  - [x] 02-01-PLAN.md — Networking module (VPC, subnets, IGW, security groups) (Wave 1)
  - [x] 02-02-PLAN.md — Database module (RDS PostgreSQL 15, subnet group, random password) (Wave 1, parallel)
  - [x] 02-03-PLAN.md — Wire modules into prod env + terraform apply + verify (Wave 2)

### Phase 3: Storage Infrastructure
**Goal**: S3 bucket for image uploads accessible by EC2 via IAM instance profile
**Depends on**: Phase 2 (VPC created for IAM instance profile attachment)
**Requirements**: STG-01, STG-02, STG-03
**Success Criteria** (what must be TRUE):
  1. S3 bucket created with block public access enabled
  2. IAM instance profile created with S3 write permissions
  3. Bucket policy allows EC2 instance profile to PutObject
  4. S3 bucket ARN and name captured for Phase 4 backend configuration
**Plans**: 1 plan in single wave
  - [x] 03-01-PLAN.md — S3 bucket + IAM instance profile (~30min, simplified from original CloudFront plan)

### Phase 4: Compute & Deployment
**Goal**: Production environment fully operational with Let's Encrypt SSL - visitors can access `https://matchcota.tech` and test tenant can manage animals
**Depends on**: Phase 2 (VPC + RDS ready), Phase 3 (S3 + IAM instance profile ready)
**Requirements**: EC2-01, EC2-02, EC2-03, EC2-04, EC2-05, SSL-01, SSL-02, SSL-03, SSL-04, DNS-06, DNS-07, DNS-08, BE-01, BE-02, BE-03, BE-04, BE-05, BE-06, BE-07, BE-08, BE-09, BE-10, BE-11, BE-12, FE-01, FE-02, FE-03, DATA-01, DATA-02, DATA-03, VER-01, VER-02, VER-03, VER-04, VER-05, VER-06, VER-07
**Success Criteria** (what must be TRUE):
  1. EC2 instance (t3.micro) running with Elastic IP, nginx, uvicorn systemd service operational
  2. certbot installed with Route 53 DNS plugin, Let's Encrypt cert issued for `matchcota.tech`
  3. nginx configured with SSL (443) and HTTP redirect (80), serving frontend from local disk
  4. Route 53 A records created for apex and pilot tenant pointing to Elastic IP
  5. Backend deployed with production .env (RDS endpoint, S3 config, secrets), Alembic migrations completed
  6. Frontend built on EC2 and served by nginx from `/opt/matchcota/frontend/dist`
  7. Test tenant `protectora-pilot` created with admin user and sample animals data
  8. Visitor can access `https://matchcota.tech` landing page and `https://protectora-pilot.matchcota.tech` tenant app
  9. Admin can log in, perform CRUD on animals (including S3 uploads), and matching test completes end-to-end
  10. boto3 Route 53 integration tested - new tenant registration creates A record automatically (DNS propagates in 5-15min)
**Plans**: 5 plans in 5 waves (~3.5h estimated)
  - [x] 04-01-PLAN.md — EC2 provisioning + Elastic IP + Route 53 A records (Wave 1, ~30min)
  - [x] 04-02-PLAN.md — Let's Encrypt SSL + nginx configuration (Wave 2, ~35min)
  - [x] 04-03-PLAN.md — Backend deployment + CORS fix + migrations + systemd (Wave 3, ~45min)
  - [x] 04-04-PLAN.md — Frontend build + test data seeding (Wave 4, ~30min)
  - [ ] 04-05-PLAN.md — E2E verification + boto3 Route 53 integration (Wave 5, ~40min)

### Phase 5: Code Revision
**Goal**: Production-ready code committed to repo. All dev content removed from frontend. Backend adapted for Lambda (Mangum handler). Tenant registration creates admin user atomically.
**Depends on**: Phase 2 (VPC/RDS architecture — Lambda connects to same RDS), Phase 3 (S3 bucket name)
**Success Criteria** (what must be TRUE):
  1. `frontend/src/pages/platform/DemoTest.jsx` deleted
  2. `frontend/src/pages/public/RegisterAnimal.jsx` deleted
  3. `App.jsx` has no `/demo` or `/register-animal` routes or their imports
  4. `Landing.jsx` has no DEVICE AREA, no apiStatus, no tenants list, no "Veure demo" button; footer email=info@matchcota.tech, year=2026
  5. `backend/app/lambda_handler.py` exists: `handler = Mangum(app, lifespan="off")`
  6. `mangum` in `backend/requirements.txt`
  7. SQLAlchemy engine uses `NullPool` when `ENVIRONMENT=production`
  8. `RegisterTenant.jsx` has `password` + `confirm_password` Zod-validated fields
  9. `create_tenant()` service creates admin `User` record atomically after tenant creation
  10. CORS allows `https://matchcota.tech` and `https://*.matchcota.tech` in production
  11. `route53.py` NOT called from tenant registration (wildcard DNS handles subdomains)
  12. All changes committed and pushed to main
**Plans**: 3 plans in 1 wave
  - [ ] 05-01-PLAN.md — Frontend cleanup: delete DemoTest/RegisterAnimal, clean App.jsx, clean Landing.jsx (Wave 1)
  - [ ] 05-02-PLAN.md — Backend Lambda adaptation: lambda_handler.py, NullPool, requirements.txt, .env.production (Wave 1)
  - [ ] 05-03-PLAN.md — Tenant registration: password fields in RegisterTenant.jsx, admin user creation, remove Route53 call (Wave 1)

### Phase 6: Lambda + API Gateway
**Goal**: FastAPI backend accessible at `https://api.matchcota.tech` via API Gateway HTTP API + Lambda in VPC
**Depends on**: Phase 5 (clean + Lambda-adapted code), Phase 2 (VPC + private subnets + RDS), Phase 3 (S3 + IAM)
**Success Criteria** (what must be TRUE):
  1. Terraform `lambda` module created (function, IAM, VPC config, env vars)
  2. Terraform `api_gateway` module created (HTTP API, Lambda integration, custom domain)
  3. Lambda deployment package (zip) built from clean backend code + dependencies
  4. Lambda deployed in VPC private subnet — can reach RDS directly
  5. S3 VPC Gateway endpoint attached to private route table (free, no NAT needed)
  6. Lambda IAM uses LabRole with S3 read/write permissions
  7. API Gateway HTTP API: all routes proxy to Lambda
  8. Custom domain `api.matchcota.tech` on API Gateway using ACM wildcard cert
  9. Route 53 A record (or ALIAS): `api.matchcota.tech` → API Gateway endpoint
  10. `curl https://api.matchcota.tech/api/v1/health` returns `{"status":"healthy"}`

### Phase 7: EC2 Frontend + Verification
**Goal**: Frontend deployed on EC2, full production environment verified end-to-end with real tenant registration
**Depends on**: Phase 5 (clean code), Phase 6 (API operational at api.matchcota.tech)
**Success Criteria** (what must be TRUE):
  1. EC2 (t3.micro, nginx only — no uvicorn/Python) provisioned via Terraform with Elastic IP
  2. Let's Encrypt wildcard cert issued for `matchcota.tech` + `*.matchcota.tech`
  3. Route 53 A records: `matchcota.tech` → EC2 Elastic IP; `*.matchcota.tech` → EC2 Elastic IP (wildcard)
  4. React app built with `VITE_API_URL=https://api.matchcota.tech` and served from nginx
  5. `https://matchcota.tech/` loads clean landing — no dev content visible
  6. `https://matchcota.tech/register-tenant` shows form with password field
  7. Register new tenant → `{slug}.matchcota.tech` resolves → admin can log in with registration password
  8. Admin: CRUD on animals with S3 photo upload returning S3 URL
  9. Matching test completes end-to-end with scored results at `{slug}.matchcota.tech/test`
  10. `infrastructure/scripts/deploy-backend.sh` and `deploy-frontend.sh` implemented

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DNS & SSL Foundation | 3/3 | Complete | 2026-04-07 |
| 2. Core Infrastructure | 3/3 | Complete | 2026-04-07 |
| 3. Storage Infrastructure | 1/1 | Complete | 2026-04-08 |
| 4. Compute & Deployment | —/— | Superseded — wrong approach | 2026-04-08 |
| 5. Code Revision | 0/3 | Planned | — |
| 6. Lambda + API Gateway | 0/? | Not started | — |
| 7. EC2 Frontend + Verification | 0/? | Not started | — |

## Notes

### Architecture (FINAL — 2026-04-08)

```
Route 53:
  matchcota.tech       → EC2 Elastic IP (A record)
  *.matchcota.tech     → EC2 Elastic IP (wildcard A record)
  api.matchcota.tech   → API Gateway (ALIAS/A record)

EC2 (t3.micro):
  nginx + Let's Encrypt wildcard SSL
  Serves: built React SPA only (no backend, no Python)

API Gateway (HTTP API):
  Custom domain: api.matchcota.tech (ACM wildcard cert)
  → Lambda (FastAPI + Mangum, VPC private subnet)
       ├── RDS PostgreSQL (private subnet, same VPC)
       └── S3 (via VPC Gateway endpoint — free)
```

### Why Phase 4 was superseded
Phase 4 cloned the dev repository directly to EC2 and ran it without removing dev-only code. The approach had no Lambda, no API Gateway, and deployed a dev-mode application. EC2 and Route 53 records were destroyed after identifying the wrong approach.

### Terraform State Note
After Phase 4 destruction, `terraform.tfstate` is stale — it still references the destroyed EC2 and Route 53 A records. Phase 6/7 planning must account for state reconciliation (`terraform plan` will detect drift and offer to recreate).

### Dependency Chain
```
Phase 1 (DNS/ACM) ✅ COMPLETE
  └─→ Phase 2 (Network/DB) ✅ COMPLETE
        └─→ Phase 3 (Storage) ✅ COMPLETE
              ├─→ Phase 5 (Code Revision) — no infra, code only
              ├─→ Phase 6 (Lambda + API GW) — needs VPC, RDS, S3
              └─→ Phase 7 (EC2 Frontend) — needs Phase 5 + 6 complete
```

### Budget Compliance
t3.micro (EC2) + db.t3.micro (RDS) + Lambda (free tier) + API Gateway HTTP API (~$1/M requests) + S3 VPC endpoint (free). No NAT Gateway, no CloudFront, no load balancer. Estimated: ~$22/month.

---
*Last updated: 2026-04-08 — Architecture revised: API Gateway + Lambda + EC2 (nginx frontend only)*
