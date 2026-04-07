# Roadmap: MatchCota AWS Production Deployment

**Created:** 2025-04-07
**Core Value:** Working HTTPS production environment at `matchcota.tech` and `*.matchcota.tech` before Sprint 6 deadline (April 6th)
**Granularity:** Coarse (3-5 phases)

## Phases

- [ ] **Phase 1: DNS & SSL Foundation** - Route 53 hosted zone, NS delegation, ACM wildcard certificate
- [ ] **Phase 2: Core Infrastructure** - VPC networking, security groups, RDS PostgreSQL database
- [ ] **Phase 3: Storage & CDN** - S3 bucket, CloudFront distribution with dual origins (API + static)
- [ ] **Phase 4: Compute & Deployment** - EC2 instance, backend/frontend deployment, verification

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
  - [ ] 02-02-PLAN.md — Database module (RDS PostgreSQL 15, subnet group, random password) (Wave 1, parallel)
  - [ ] 02-03-PLAN.md — Wire modules into prod env + terraform apply + verify (Wave 2)

### Phase 3: Storage & CDN
**Goal**: CloudFront distribution serving both frontend (S3) and API (EC2) with HTTPS via ACM wildcard cert
**Depends on**: Phase 1 (ACM certificate validated), Phase 2 (EC2 security group exists for origin config)
**Requirements**: CDN-01, CDN-02, CDN-03, CDN-04, CDN-05, CDN-06, CDN-07, CDN-08, CDN-09
**Success Criteria** (what must be TRUE):
  1. S3 bucket created with block public access enabled and OAC policy for CloudFront
  2. CloudFront distribution deployed with ACM wildcard certificate attached
  3. CloudFront behavior `/api/*` routes to EC2 origin (HTTP, port 80) with no caching
  4. CloudFront default behavior `/*` routes to S3 origin with caching for static assets
  5. Route 53 ALIAS records point `matchcota.tech` and `*.matchcota.tech` to CloudFront distribution
**Plans**: TBD

### Phase 4: Compute & Deployment
**Goal**: Production environment fully operational - visitors can access `https://matchcota.tech` and test tenant can manage animals
**Depends on**: Phase 2 (VPC + RDS ready), Phase 3 (CloudFront + S3 ready for origins)
**Requirements**: EC2-01, EC2-02, EC2-03, EC2-04, EC2-05, BE-01, BE-02, BE-03, BE-04, BE-05, BE-06, BE-07, BE-08, BE-09, BE-10, BE-11, BE-12, FE-01, FE-02, FE-03, DATA-01, DATA-02, DATA-03, VER-01, VER-02, VER-03, VER-04, VER-05, VER-06, VER-07
**Success Criteria** (what must be TRUE):
  1. EC2 instance (t3.micro) running with Elastic IP, nginx, uvicorn systemd service operational
  2. Backend deployed with production .env (RDS endpoint, S3 config, secrets), Alembic migrations completed
  3. Frontend built and synced to S3 bucket, CloudFront cache invalidated
  4. Test tenant `protectora-pilot` created with admin user and sample animals data
  5. Visitor can access `https://matchcota.tech` landing page and `https://protectora-pilot.matchcota.tech` tenant app via CloudFront
  6. Admin can log in, perform CRUD on animals (including S3 uploads), and matching test completes end-to-end
  7. New tenant registration creates working subdomain instantly (wildcard DNS + existing API endpoint)
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DNS & SSL Foundation | 3/3 | Complete | 2026-04-07 |
| 2. Core Infrastructure | 1/3 | In Progress|  |
| 3. Storage & CDN | 0/0 | Not started | - |
| 4. Compute & Deployment | 0/0 | Not started | - |

## Notes

### Critical Path
Phase 1 is the critical path. ACM certificate validation depends on DNS propagation (15min-48hrs) and blocks CloudFront deployment in Phase 3. **Start DNS/ACM immediately.**

### Dependency Chain
```
Phase 1 (DNS/ACM) 
  ├─→ Phase 2 (Network/DB) - Can start in parallel, needs AWS creds
  ├─→ Phase 3 (Storage/CDN) - BLOCKED until ACM validated
  └─→ Phase 4 (Compute/Deploy) - Needs Phase 2 (RDS) + Phase 3 (S3/CloudFront)
```

### Budget Compliance
All requirements specify t3.micro (EC2) and db.t3.micro (RDS) to stay within $50 budget. No multi-AZ, no NAT Gateway, no load balancer.

### SSL Architecture
CloudFront terminates ALL SSL (ACM certs are free but non-exportable). EC2 receives plain HTTP from CloudFront (secure because EC2 security group only allows CloudFront IPs).

---
*Last updated: 2026-04-07 after Phase 2 planning*
