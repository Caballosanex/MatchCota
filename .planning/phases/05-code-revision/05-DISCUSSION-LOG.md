# Phase 05: Code Revision — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 05-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 05-code-revision
**Areas discussed:** Architecture reset, frontend cleanup scope, deployment pipeline, tenant registration, Route 53 strategy, phase scope

---

## Session context

This discussion was initiated as `/gsd:discuss-phase 4` but concluded by defining entirely new phases 5, 6, and 7. Phase 4 was identified as a wrong implementation (dev repo cloned to EC2, no Lambda, wrong architecture). The EC2 and Route 53 records from Phase 4 were manually destroyed.

The user is the ASIX (infrastructure) team member. Code-level decisions are Claude's responsibility.

---

## Area: CloudFront viability

| Option | Description | Selected |
|--------|-------------|----------|
| Try CloudFront again | CDN module exists, ACM cert issued | |
| CloudFront definitely blocked | Lab IAM doesn't allow it | ✓ |
| Not sure | Try with fallback | |

**User's choice:** Definitely blocked (lab account IAM restriction — `cloudfront:CreateOriginAccessControl` denied)
**Notes:** This was confirmed in Phase 4. Do not retry.

---

## Area: Frontend deployment pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Build locally + rsync to EC2 | Clean separation | |
| Build on EC2 (git pull + npm build) | Node already installed on EC2 | |
| GitHub Actions CI/CD | Automated pipeline | |

**User's choice:** Deferred to Claude — recommended: build on EC2 after git pull of clean repo. Finalized as Phase 7 scope.
**Notes:** User is infra-only, not a developer. Claude decided: git pull clean repo → npm build on EC2 → nginx serves dist/.

---

## Area: Tenant registration admin user creation

| Option | Description | Selected |
|--------|-------------|----------|
| Add password field, atomic creation | Clean UX, correct flow | ✓ |
| Separate admin setup step | Two-step onboarding | |

**User's choice:** "I guess" (confirmed the password field + atomic creation approach)
**Notes:** No migration needed — users table schema already correct.

---

## Area: Route 53 strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Wildcard A record only | One record, zero automation | |
| Per-tenant boto3 records on registration | Automated, already implemented in Phase 4 | ✓ |

**User's choice:** Automated (per-tenant boto3)
**Notes:** Later reversed — after architecture pivot to Lambda + API Gateway, wildcard is simpler and boto3 Route 53 calls are removed from registration. The "automated" intent is preserved by the wildcard covering all tenants automatically.

---

## Area: Phase scope

| Option | Description | Selected |
|--------|-------------|----------|
| Redo Phase 4 in-place | Overwrite Phase 4 plans | |
| Add new Phase 5 | Keep Phase 4 as history | ✓ (initially) |
| Multiple new phases (5, 6, 7) | Correct split by concern | ✓ (final) |

**User's choice:** "As a new phase" initially, then clarified that Phase 4 was wrong from the start → resulted in three new phases (5, 6, 7).

---

## Area: Backend architecture (critical pivot)

| Option | Description | Selected |
|--------|-------------|----------|
| FastAPI on EC2 (uvicorn + systemd) | Phase 4 approach | |
| API Gateway + Lambda (FastAPI + Mangum) | Serverless, proper AWS | ✓ |
| API Gateway as proxy for EC2 | Middleground | |

**User's choice:** API Gateway + Lambda. Also stated: "the FastAPI is dev too — we must migrate that API to API Gateway."
**Notes:** FastAPI code is valid and kept — Mangum makes it Lambda-compatible. No rewrite needed.

---

## Area: Frontend serving (given CloudFront blocked)

| Option | Description | Selected |
|--------|-------------|----------|
| EC2/nginx serving built React dist | Simple, Let's Encrypt handles SSL | ✓ |
| S3 static website | No HTTPS without CloudFront | |
| Application Load Balancer | Too expensive (~$18/month) | |

**User's choice:** nginx on EC2 (1A in Claude's presented options)

---

## Final Architecture Confirmed

User confirmed "yes that's good" to:

```
Route 53:
  matchcota.tech       → EC2 Elastic IP (nginx + Let's Encrypt)
  *.matchcota.tech     → EC2 Elastic IP (wildcard — all tenant subdomains)
  api.matchcota.tech   → API Gateway (ACM wildcard cert)

EC2: nginx only, serves built React SPA
API Gateway → Lambda (FastAPI + Mangum, VPC private subnet)
Lambda → RDS (same VPC private subnet)
Lambda → S3 (via VPC Gateway endpoint, free)
```

---

## Claude's Discretion

- RegisterAnimal.jsx identified as dev-only (public route posting to admin endpoint — duplicate of /admin/animals/new)
- SQLAlchemy NullPool chosen for Lambda (standard pattern to prevent connection exhaustion)
- Zod refine() for password confirmation match
- `.env.production` file approach for build-time env vars
- Route 53 automation removed (wildcard is simpler and equivalent for MVP)

## Deferred Ideas

- CI/CD pipeline → Sprint 8 / post-demo
- CloudFront → blocked permanently in lab account
- boto3 per-tenant DNS → removed in favour of wildcard
- Email/SES → Sprint 7
