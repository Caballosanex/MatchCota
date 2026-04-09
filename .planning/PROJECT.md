# MatchCota AWS Production Deployment

## What This Is

MatchCota is now in a shipped v1.0 production state for `matchcota.tech` on AWS Academy-compatible infrastructure patterns. The codebase contains production deployment operations, validation scripts, and runbook workflows to maintain the registration -> tenant subdomain -> login core flow over HTTPS.

## Core Value

A new shelter can register at `matchcota.tech`, instantly get `{slug}.matchcota.tech`, and log in with the password they created, fully over HTTPS.

## Current State

- Milestone `v1.0` archived on 2026-04-09.
- Delivered scope: infrastructure operations baseline, DNS/TLS readiness, private data plane provisioning, Lambda runtime backend, production frontend hardening, and launch-readiness verification runbook.
- Archive references:
  - `.planning/milestones/v1.0-ROADMAP.md`
  - `.planning/milestones/v1.0-REQUIREMENTS.md`
  - `.planning/MILESTONES.md`

## Next Milestone Goals

- Run `/gsd-new-milestone` to define fresh requirements and next roadmap.
- Triage and re-plan accepted debt from v1.0 known gaps.
- Add milestone audit discipline (`/gsd-audit-milestone`) before next closeout.

## Active Constraints

- **Cloud Account**: AWS Academy Lab (`us-east-1`) with temporary credentials.
- **IAM**: Use only `LabRole` and `LabInstanceProfile` (no custom IAM role creation).
- **Architecture**: Keep locked topology (Route53 wildcard DNS, EC2 nginx static SPA, API Gateway custom domain, Lambda in VPC, private RDS, S3 via Gateway endpoint).
- **Service Restrictions**: CloudFront, CloudWatch, and SES unavailable in account.
- **Budget**: Keep within approximately $50/month target (avoid NAT Gateway and Multi-AZ RDS).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use AWS Academy-compatible IaC/runtime constraints for v1 | Keep deployment feasible under account restrictions and budget | ✓ Good |
| Use wildcard DNS onboarding instead of per-tenant Route53 mutation | Reduce onboarding fragility and runtime DNS coupling | ✓ Good |
| Serve frontend statically on EC2/nginx and backend on Lambda/API Gateway | Align with target architecture and lower operational complexity | ✓ Good |
| Require runbook-grade readiness + data-audit checks before launch claims | Prevent false-positive production readiness | ✓ Good |

<details>
<summary>Archived v1.0 planning baseline</summary>

Previous project sections (requirements backlog, milestone-internal context, and pre-v1 planning narrative) are archived in:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

</details>

---
*Last updated: 2026-04-09 after v1.0 milestone completion*
