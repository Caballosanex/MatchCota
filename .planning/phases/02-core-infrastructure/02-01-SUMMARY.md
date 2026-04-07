---
phase: 02-core-infrastructure
plan: 01
subsystem: infra
tags: [terraform, vpc, networking, security-groups, aws, cloudfront]

# Dependency graph
requires:
  - phase: 01-dns-ssl-foundation
    provides: ACM wildcard certificate and Route 53 hosted zone (foundation for CloudFront)
provides:
  - VPC (10.0.0.0/16) with DNS support enabled
  - 2 public subnets (us-east-1a/1b) for EC2
  - 2 private subnets (us-east-1a/1b) for RDS
  - Internet Gateway with public route table
  - EC2 security group accepting HTTP from CloudFront prefix list + SSH from 0.0.0.0/0
  - RDS security group accepting PostgreSQL only from EC2 security group
  - Networking module outputs contract (vpc_id, subnet IDs, SG IDs)
affects:
  - 02-02 (database module — needs private_subnet_ids, ec2_security_group_id, rds_security_group_id)
  - 02-03 (prod environment wiring — composes networking module)
  - 03-cloudfront (needs ec2_security_group_id for origin access)
  - 04-compute-deploy (needs vpc_id, public_subnet_ids)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Terraform count-based subnet pattern: count = length(var.subnet_cidrs) with availability_zone indexed by count.index"
    - "CloudFront managed prefix list as EC2 HTTP ingress source (instead of CIDR, prevents direct bypass)"
    - "RDS security group restricts ingress to EC2 SG ID only (no CIDR range needed)"
    - "Private route table with no routes (RDS has no internet path even if misconfigured)"

key-files:
  created:
    - infrastructure/terraform/modules/networking/variables.tf
    - infrastructure/terraform/modules/networking/main.tf
    - infrastructure/terraform/modules/networking/outputs.tf
  modified: []

key-decisions:
  - "EC2 SG HTTP ingress uses CloudFront managed prefix list (com.amazonaws.global.cloudfront.origin-facing) instead of open CIDR — prevents direct internet access to EC2, forcing all traffic through CloudFront"
  - "Private route table has no default route — RDS in private subnet has no internet path even if SG misconfigured"
  - "RDS SG egress limited to VPC CIDR (10.0.0.0/16) — database can only communicate within VPC"

patterns-established:
  - "All Terraform resources tagged with: Name, Project=matchcota, Environment=production, ManagedBy=terraform"
  - "Module outputs named to match downstream consumer contracts (exact names agreed in 02-CONTEXT.md)"

requirements-completed: [NET-01, NET-02, NET-03, NET-04, NET-05, NET-06]

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 2 Plan 01: Networking Module Summary

**Terraform networking module with VPC, 4 subnets, IGW, route tables, and security groups restricting EC2 to CloudFront-only HTTP and RDS to EC2-only PostgreSQL**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-07T14:00:05Z
- **Completed:** 2026-04-07T14:02:11Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created self-contained `networking` Terraform module with 3 files (variables.tf, main.tf, outputs.tf)
- Defined complete network topology: VPC + IGW + 2 public subnets (EC2) + 2 private subnets (RDS) + route tables
- EC2 security group locks HTTP ingress to CloudFront managed prefix list (prevents direct internet bypass)
- RDS security group restricts PostgreSQL to EC2 SG only — no public access path possible
- Exported all 5 outputs required by downstream plans (02-02 database, 02-03 wiring, Phase 3 CloudFront, Phase 4 compute)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create networking/variables.tf** - `49afd3d` (feat)
2. **Task 2: Create networking/main.tf** - `504f94e` (feat)
3. **Task 3: Create networking/outputs.tf** - `1122add` (feat)

## Files Created/Modified
- `infrastructure/terraform/modules/networking/variables.tf` - 4 input variables: vpc_cidr, public_subnet_cidrs, private_subnet_cidrs, availability_zones
- `infrastructure/terraform/modules/networking/main.tf` - VPC, IGW, 4 subnets, 2 route tables, CloudFront prefix list data source, EC2 SG, RDS SG
- `infrastructure/terraform/modules/networking/outputs.tf` - 5 outputs: vpc_id, public_subnet_ids, private_subnet_ids, ec2_security_group_id, rds_security_group_id

## Decisions Made
- EC2 SG HTTP ingress uses CloudFront managed prefix list (`com.amazonaws.global.cloudfront.origin-facing`) — this ensures EC2 only accepts traffic from CloudFront IPs, not the open internet, even if DNS were bypassed
- Private route table deliberately has no routes — RDS has no internet path even if a misconfiguration occurs
- RDS SG egress limited to VPC CIDR `10.0.0.0/16` — database cannot initiate external connections

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Networking module complete and ready to be composed in `environments/prod/main.tf` (Plan 02-03)
- Plan 02-02 (database module) can proceed immediately — it consumes `private_subnet_ids`, `ec2_security_group_id`, and `rds_security_group_id` from this module's outputs
- All output names match the contracts defined in 02-CONTEXT.md — no downstream plan changes needed

---
*Phase: 02-core-infrastructure*
*Completed: 2026-04-07*
