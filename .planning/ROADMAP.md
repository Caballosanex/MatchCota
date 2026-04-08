# Roadmap: MatchCota AWS Production Deployment

**Created:** 2025-04-07
**Core Value:** Working HTTPS production environment at `matchcota.tech` and `*.matchcota.tech` before Sprint 6 deadline (April 6th)
**Granularity:** Coarse (3-5 phases)

## Phases

- [x] **Phase 1: DNS & SSL Foundation** - Route 53 hosted zone, NS delegation, ACM wildcard certificate (completed 2026-04-07)
- [x] **Phase 2: Core Infrastructure** - VPC networking, security groups, RDS PostgreSQL database (completed 2026-04-07)
- [ ] **Phase 3: Storage Infrastructure** - S3 bucket for image uploads with IAM instance profile policy
- [ ] **Phase 4: Compute & Deployment** - EC2 instance, Let's Encrypt SSL, backend/frontend deployment, Route 53 automation, verification

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
  - [ ] 04-01-PLAN.md — EC2 provisioning + Elastic IP + Route 53 A records (Wave 1, ~30min)
  - [ ] 04-02-PLAN.md — Let's Encrypt SSL + nginx configuration (Wave 2, ~35min)
  - [ ] 04-03-PLAN.md — Backend deployment + CORS fix + migrations + systemd (Wave 3, ~45min)
  - [ ] 04-04-PLAN.md — Frontend build + test data seeding (Wave 4, ~30min)
  - [ ] 04-05-PLAN.md — E2E verification + boto3 Route 53 integration (Wave 5, ~40min)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DNS & SSL Foundation | 3/3 | Complete | 2026-04-07 |
| 2. Core Infrastructure | 3/3 | Complete | 2026-04-07 |
| 3. Storage Infrastructure | 1/1 | Complete | 2026-04-08 |
| 4. Compute & Deployment | 0/5 | Planned | - |

## Notes

### Critical Path
Phase 1 was the critical path for DNS propagation. **Architecture changed on 2026-04-08:** AWS Academy Lab accounts block CloudFront IAM permissions, switched to Let's Encrypt SSL on EC2 with per-tenant Route 53 A records.

### Dependency Chain
```
Phase 1 (DNS/ACM) ✅ COMPLETE
  ├─→ Phase 2 (Network/DB) ✅ COMPLETE
  ├─→ Phase 3 (Storage) - S3 bucket only, no CloudFront
  └─→ Phase 4 (Compute/Deploy) - Needs Phase 2 (RDS) + Phase 3 (S3)
```

### Budget Compliance
All requirements specify t3.micro (EC2) and db.t3.micro (RDS) to stay within $50 budget. No multi-AZ, no NAT Gateway, no load balancer, no CloudFront.

### SSL Architecture (REVISED 2026-04-08)
**Original:** CloudFront terminates ALL SSL (ACM certs free but non-exportable), EC2 receives plain HTTP
**Revised:** Let's Encrypt certificates on EC2 with nginx SSL termination, certbot with Route 53 DNS plugin for domain validation, 90-day renewal via cron job, per-tenant A records automated via boto3

**Reason for Change:** AWS Academy Lab accounts have no CloudFront IAM permissions (`cloudfront:CreateOriginAccessControl` denied). Cannot proceed with original architecture without instructor intervention.

---
*Last updated: 2026-04-08 — Phase 4 planning complete (5 plans created)*
