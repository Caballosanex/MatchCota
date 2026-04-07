# Requirements: MatchCota AWS Production Deployment

**Defined:** 2025-04-07
**Core Value:** Working HTTPS production environment at `matchcota.tech` and `*.matchcota.tech` before Sprint 6 deadline (April 6th)

## v1 Requirements (Sprint 6 Deliverables)

Requirements for AWS production deployment. Each maps to roadmap phases.

### AWS Foundation

- [x] **AWS-01**: AWS CLI profile `matchcota` configured with lab session credentials
- [x] **AWS-02**: AWS credentials verified (account 788602800812, us-east-1)
- [x] **AWS-03**: SSH key pair generated locally and imported to AWS

### DNS and SSL

- [x] **DNS-01**: Route 53 hosted zone created for `matchcota.tech`
- [x] **DNS-02**: Route 53 NS records output for manual DotTech configuration
- [x] **DNS-03**: NS delegation configured at DotTech registrar
- [x] **DNS-04**: ACM wildcard certificate requested for `*.matchcota.tech` and `matchcota.tech`
- [x] **DNS-05**: ACM certificate validated via DNS (auto-creates validation records)

### Networking

- [x] **NET-01**: VPC created with CIDR 10.0.0.0/16
- [x] **NET-02**: 2 public subnets created (for EC2)
- [x] **NET-03**: 2 private subnets created (for RDS)
- [x] **NET-04**: Internet Gateway attached to VPC
- [x] **NET-05**: Security group for EC2 (HTTP from CloudFront IPs, SSH from admin IP)
- [x] **NET-06**: Security group for RDS (PostgreSQL from EC2 security group only)

### Database

- [x] **DB-01**: RDS PostgreSQL 15 instance created (db.t3.micro, 20GB)
- [x] **DB-02**: RDS placed in private subnets with RDS security group
- [x] **DB-03**: Database name `matchcota` and username `matchcota` configured
- [x] **DB-04**: Master password generated and stored securely
- [x] **DB-05**: 7-day backup retention enabled

### Storage and CDN

- [ ] **CDN-01**: S3 bucket created for frontend and uploads
- [ ] **CDN-02**: S3 bucket configured with block public access + OAC policy
- [ ] **CDN-03**: CloudFront distribution created with ACM certificate
- [ ] **CDN-04**: CloudFront origin 1 configured (S3 bucket with OAC)
- [ ] **CDN-05**: CloudFront origin 2 configured (EC2 Elastic IP, HTTP port 80)
- [ ] **CDN-06**: CloudFront behavior `/api/*` routes to EC2 origin
- [ ] **CDN-07**: CloudFront default behavior `/*` routes to S3 origin
- [ ] **CDN-08**: CloudFront alternate domains `matchcota.tech` and `*.matchcota.tech` configured
- [ ] **CDN-09**: Route 53 ALIAS records point to CloudFront distribution

### Compute

- [ ] **EC2-01**: EC2 instance created (t3.micro, Amazon Linux 2023)
- [ ] **EC2-02**: Elastic IP allocated and associated with EC2
- [ ] **EC2-03**: EC2 placed in public subnet with EC2 security group
- [ ] **EC2-04**: IAM instance profile attached (LabRole for S3 access)
- [ ] **EC2-05**: EC2 SSH access verified from admin machine

### Backend Deployment

- [ ] **BE-01**: Python 3.11, pip, nginx, git installed on EC2
- [ ] **BE-02**: System user `matchcota` created on EC2
- [ ] **BE-03**: App directory `/opt/matchcota` created with correct ownership
- [ ] **BE-04**: Python venv created at `/opt/matchcota/venv`
- [ ] **BE-05**: Code repository cloned to EC2
- [ ] **BE-06**: Backend dependencies installed in venv
- [ ] **BE-07**: Production .env file created with RDS endpoint, S3 config, secrets
- [ ] **BE-08**: systemd service file installed for uvicorn
- [ ] **BE-09**: nginx config installed for reverse proxy + subdomain extraction
- [ ] **BE-10**: Alembic migrations run against RDS (create schema)
- [ ] **BE-11**: systemd matchcota service started and enabled
- [ ] **BE-12**: nginx service started and enabled

### Frontend Deployment

- [ ] **FE-01**: Frontend built with production VITE_API_URL
- [ ] **FE-02**: Frontend dist/ synced to S3 bucket
- [ ] **FE-03**: CloudFront cache invalidated after deployment

### Data Migration

- [ ] **DATA-01**: Test tenant `protectora-pilot` created in RDS
- [ ] **DATA-02**: Admin user created for test tenant
- [ ] **DATA-03**: Sample animals data loaded for testing

### Verification

- [ ] **VER-01**: `https://matchcota.tech` loads landing page via CloudFront
- [ ] **VER-02**: `https://protectora-pilot.matchcota.tech` loads tenant app
- [ ] **VER-03**: Admin login works at tenant subdomain
- [ ] **VER-04**: Animal CRUD operations work (including S3 image upload)
- [ ] **VER-05**: Matching test completes end-to-end
- [ ] **VER-06**: Lead capture creates database record
- [ ] **VER-07**: New tenant registration creates working subdomain

## v2 Requirements

Deferred to Sprint 7 or future iterations. Not in current deployment scope.

### CI/CD Automation

- **CICD-01**: GitHub Actions workflow for automated backend deployment
- **CICD-02**: GitHub Actions workflow for automated frontend deployment
- **CICD-03**: Automated testing before deployment
- **CICD-04**: Rollback mechanism for failed deployments

### Monitoring and Logging

- **MON-01**: CloudWatch logs for application errors
- **MON-02**: CloudWatch metrics for RDS performance
- **MON-03**: CloudWatch alarms for critical failures
- **MON-04**: Application performance monitoring (APM)

### Email Service

- **EMAIL-01**: SES configured for transactional emails
- **EMAIL-02**: Email verification flow enabled
- **EMAIL-03**: Password reset emails enabled
- **EMAIL-04**: Lead notification emails to shelters

### Scaling and Performance

- **SCALE-01**: RDS Multi-AZ for high availability
- **SCALE-02**: Auto-scaling group for EC2 instances
- **SCALE-03**: Application Load Balancer replacing direct EC2 origin
- **SCALE-04**: ElastiCache Redis for session management

## Out of Scope

Explicitly excluded to stay within Sprint 6 constraints and budget.

| Feature | Reason |
|---------|--------|
| Docker in production | Single-instance deployment, systemd + native Python is simpler and sufficient |
| Lambda for tenant onboarding | Existing API endpoint handles tenant creation, wildcard DNS handles routing |
| Multi-AZ RDS | Exceeds $50 budget ($26/month vs $13/month), not required for school demo |
| NAT Gateway | Exceeds budget ($32/month), EC2 in public subnet is acceptable |
| Custom IAM roles | Lab account restrictions, must use existing LabRole |
| CloudWatch advanced monitoring | Basic monitoring sufficient for MVP, advanced features add cost |
| Load balancer | Single EC2 sufficient, ALB adds $16/month to budget |
| Redis caching | Optional for MVP, EC2 has enough memory for session storage |
| Custom SSL on EC2 | ACM certificates are non-exportable, CloudFront SSL termination is the solution |
| SES email service | Blocked in lab accounts, will be added in Sprint 7 with SMTP alternative |
| Separate staging environment | Budget constraint, single production environment for school project |
| Automated backups beyond RDS | RDS 7-day retention sufficient, S3 versioning not needed for MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AWS-01 | Phase 1 | Complete |
| AWS-02 | Phase 1 | Complete |
| AWS-03 | Phase 1 | Complete |
| DNS-01 | Phase 1 | Complete |
| DNS-02 | Phase 1 | Complete |
| DNS-03 | Phase 1 | Complete |
| DNS-04 | Phase 1 | Complete |
| DNS-05 | Phase 1 | Complete |
| NET-01 | Phase 2 | Complete |
| NET-02 | Phase 2 | Complete |
| NET-03 | Phase 2 | Complete |
| NET-04 | Phase 2 | Complete |
| NET-05 | Phase 2 | Complete |
| NET-06 | Phase 2 | Complete |
| DB-01 | Phase 2 | Complete |
| DB-02 | Phase 2 | Complete |
| DB-03 | Phase 2 | Complete |
| DB-04 | Phase 2 | Complete |
| DB-05 | Phase 2 | Complete |
| CDN-01 | Phase 3 | Pending |
| CDN-02 | Phase 3 | Pending |
| CDN-03 | Phase 3 | Pending |
| CDN-04 | Phase 3 | Pending |
| CDN-05 | Phase 3 | Pending |
| CDN-06 | Phase 3 | Pending |
| CDN-07 | Phase 3 | Pending |
| CDN-08 | Phase 3 | Pending |
| CDN-09 | Phase 3 | Pending |
| EC2-01 | Phase 4 | Pending |
| EC2-02 | Phase 4 | Pending |
| EC2-03 | Phase 4 | Pending |
| EC2-04 | Phase 4 | Pending |
| EC2-05 | Phase 4 | Pending |
| BE-01 | Phase 4 | Pending |
| BE-02 | Phase 4 | Pending |
| BE-03 | Phase 4 | Pending |
| BE-04 | Phase 4 | Pending |
| BE-05 | Phase 4 | Pending |
| BE-06 | Phase 4 | Pending |
| BE-07 | Phase 4 | Pending |
| BE-08 | Phase 4 | Pending |
| BE-09 | Phase 4 | Pending |
| BE-10 | Phase 4 | Pending |
| BE-11 | Phase 4 | Pending |
| BE-12 | Phase 4 | Pending |
| FE-01 | Phase 4 | Pending |
| FE-02 | Phase 4 | Pending |
| FE-03 | Phase 4 | Pending |
| DATA-01 | Phase 4 | Pending |
| DATA-02 | Phase 4 | Pending |
| DATA-03 | Phase 4 | Pending |
| VER-01 | Phase 4 | Pending |
| VER-02 | Phase 4 | Pending |
| VER-03 | Phase 4 | Pending |
| VER-04 | Phase 4 | Pending |
| VER-05 | Phase 4 | Pending |
| VER-06 | Phase 4 | Pending |
| VER-07 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52 ✓
- Unmapped: 0

**Phase Distribution:**
- Phase 1 (DNS & SSL Foundation): 8 requirements
- Phase 2 (Core Infrastructure): 11 requirements
- Phase 3 (Storage & CDN): 9 requirements
- Phase 4 (Compute & Deployment): 24 requirements

---
*Requirements defined: 2025-04-07*
*Last updated: 2025-04-07 after roadmap creation*
