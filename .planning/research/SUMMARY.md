# Project Research Summary

**Project:** MatchCota
**Domain:** AWS production migration for a multi-tenant FastAPI + React SaaS under AWS Academy constraints
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

MatchCota is best built as a **constraint-aware multi-tenant SaaS** where DNS/TLS and tenant trust boundaries are treated as first-class architecture decisions, not post-launch hardening. The strongest expert consensus across the research is to keep the locked topology (EC2+nginx for wildcard SPA, API Gateway HTTP API + Lambda/Mangum for backend, private RDS Postgres, S3 via VPC endpoint) and optimize for reliability under Academy limitations (temporary credentials, no custom IAM roles, no CloudFront/SES/CloudWatch-heavy assumptions).

The recommended approach is opinionated: pre-provision wildcard DNS/certs once, keep onboarding purely app-data transactional (no runtime Route53 writes), and ship only after end-to-end proof that a new shelter can register, resolve `{slug}.matchcota.tech`, log in, and reach admin without manual intervention. Terraform must be executed in slices with explicit gates, not as a one-shot apply, to survive credential expiry and minimize blast radius.

Top risks are onboarding partial failures, DNS/TLS drift, tenant-isolation bypass, and Lambda→RDS connection pressure. Mitigation is equally clear: atomic tenant+admin transactions, registrar/delegation checklists with automated smoke checks, strict host-derived tenant resolution with negative tests, and explicit DB guardrails (reserved concurrency + conservative pooling, with RDS Proxy evaluation if load demonstrates need and permissions allow).

## Key Findings

### Recommended Stack

Research converges on a pragmatic 2026 serverless-edge stack that preserves existing FastAPI/React code while reducing migration risk. The key is not novelty; it is reproducibility and safe operations under lab constraints.

**Core technologies:**
- **Terraform `~>1.14` + AWS Provider `~>6.39`**: Infrastructure as code with modern AWS coverage and stable release pairing.
- **API Gateway HTTP API (payload 2.0) + Lambda Python 3.13 + Mangum**: Lowest-friction path to run existing FastAPI in locked target architecture.
- **RDS PostgreSQL 15 (private, single-AZ)**: Fits current app model and budget constraints.
- **EC2 (AL2023) + nginx**: Required wildcard-host SPA delivery pattern for tenant subdomains.
- **S3 + Gateway VPC Endpoint**: Private object access from Lambda without NAT cost.

**Critical version/operational requirements:**
- Package Lambda artifacts in Linux-compatible Docker image; do not package on macOS host.
- Pin `boto3` inside Lambda artifact to avoid runtime drift.
- Use remote Terraform state + locking and modular applies due to expiring credentials.

### Expected Features

Launch scope is dominated by reliability features, not net-new product surface area.

**Must have (table stakes):**
- Wildcard DNS/TLS correctness for apex + wildcard tenant hosts + API domain.
- Atomic tenant onboarding with immediate admin access.
- Trusted tenant resolution from hostname (not client-forged tenant headers).
- Production security baseline on signup/auth (rate limiting/challenge/slug policy/audit trail).
- Data safety baseline (backup, migration discipline, tested restore).
- Reproducible deploy runbook + mandatory E2E onboarding smoke verification.

**Should have (differentiators):**
- Onboarding readiness SLA/status checkpoints.
- Moderated onboarding mode (invite/approval toggle).
- One-command post-deploy verification bundle.
- Structured onboarding event diagnostics.

**Defer (v2+):**
- Full CI/CD blue-green sophistication.
- Expanded observability platform.
- Major auth redesign (SSO/advanced RBAC/refresh-token expansion).

### Architecture Approach

The target architecture is a clean split of **DNS/TLS edge**, **frontend delivery plane**, **API plane**, and **private data plane**, with tenant isolation enforced in application logic via host-resolved tenancy and mandatory `tenant_id` query scoping. Architectural guidance strongly favors immutable infra/artifact releases, removing infra side effects from request paths, and sequencing delivery by dependency-gated slices.

**Major components:**
1. **Route53 + ACM** — authoritative DNS and certificate lifecycle for apex/wildcard/API names.
2. **EC2 + nginx frontend host** — wildcard SPA serving with HTTPS/security headers and host preservation.
3. **API Gateway + Lambda (FastAPI/Mangum)** — stateless API execution and security boundary.
4. **RDS PostgreSQL** — tenant-scoped relational source of truth.
5. **S3 + VPC endpoint** — tenant-prefixed image/object storage without NAT.

### Critical Pitfalls

1. **Non-atomic onboarding (“signup succeeded” but unusable tenant)** — prevent with one-transaction tenant+admin bootstrap and E2E registration→login proof.
2. **DNS/certificate drift for wildcard routing** — prevent with delegation gates, codified ACM validation, and automated DNS/TLS smoke matrix.
3. **Lambda-to-RDS connection storms** — prevent with reserved concurrency, Lambda-safe SQLAlchemy settings, and early load testing (evaluate RDS Proxy where feasible).
4. **Credential expiry during Terraform apply** — prevent with short slice-based applies, remote state locking, and explicit resume runbooks.
5. **Tenant isolation bypass via header/host trust confusion** — prevent with strict trusted-host contract and cross-tenant denial tests.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Terraform Operating Model + Scope Guardrails
**Rationale:** Every later phase depends on reliable, resumable infra operations in Academy sessions.
**Delivers:** Remote state/locking, apply slicing strategy, allowed-services matrix, budget guardrails, resume runbook.
**Addresses:** Reproducible infrastructure table stake.
**Avoids:** Credential-expiry drift and unsupported-service redesign loops.

### Phase 2: DNS/TLS Foundation and Delegation Control
**Rationale:** Tenant onboarding and wildcard UX are impossible without stable DNS/TLS first.
**Delivers:** Route53 hosted zone wiring, registrar NS delegation checks, ACM issuance for apex/wildcard/API, DNS/TLS smoke script.
**Addresses:** Wildcard DNS/TLS table stake.
**Avoids:** DNS/cert drift and launch-day hostname failures.

### Phase 3: Data Plane Provisioning + Migration Safety
**Rationale:** Backend runtime cutover needs stable DB/storage and rollback discipline.
**Delivers:** Private RDS + subnet/SG boundaries, S3 with tenant key-prefix policy + VPC endpoint, migration rehearsal + restore drill.
**Addresses:** Data safety baseline.
**Avoids:** Irreversible schema mistakes and cross-tenant storage leakage.

### Phase 4: Backend Runtime Migration + Tenant Trust Boundary
**Rationale:** Core business risk sits in onboarding correctness and tenant isolation at API layer.
**Delivers:** Mangum Lambda runtime, API custom domain mapping, strict host-derived tenant resolution, atomic tenant+admin onboarding transaction, auth/tenant negative tests.
**Addresses:** Atomic onboarding and trusted tenant resolution table stakes.
**Avoids:** Partial onboarding state and cross-tenant access bypass.

### Phase 5: Frontend Production Host Cutover + Security Baseline
**Rationale:** Public experience must align with finalized API/domain contract and remove dev surfaces.
**Delivers:** nginx hardened wildcard SPA hosting, production route pruning, strict CORS/origin alignment, signup abuse controls.
**Addresses:** Production security baseline.
**Avoids:** exposed diagnostics, CORS misconfig, and abuse-prone onboarding.

### Phase 6: E2E Verification + Capacity Guardrails
**Rationale:** “Done” requires business-flow proof and performance safety under burst.
**Delivers:** One-command smoke suite (register→login→admin→upload→matching), load tests, Lambda concurrency limits, DB guardrail tuning, rollback drills.
**Addresses:** E2E onboarding verification and operational readiness.
**Avoids:** launch regressions and DB saturation incidents.

### Phase Ordering Rationale

- Dependencies are linear and strict: ops model → DNS/TLS → data plane → API/onboarding trust boundary → frontend cutover → acceptance/perf hardening.
- This grouping mirrors architecture slices and minimizes rework by validating the highest external-risk boundaries first.
- The order directly neutralizes top pitfalls before scaling user-visible onboarding.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** ACM exportability and nginx TLS material workflow under Academy policy constraints.
- **Phase 6:** RDS Proxy feasibility versus direct-DB pattern in restricted IAM environment; confirm with load-test evidence.

Phases with standard patterns (likely skip `/gsd-research-phase`):
- **Phase 1:** Terraform remote state/locking and sliced applies are mature, well-documented patterns.
- **Phase 3:** Private RDS + S3 endpoint topology is standard AWS practice.
- **Phase 4 (core adapter path):** FastAPI + Mangum on HTTP API payload 2.0 is established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Strong official AWS/Terraform backing; moderate uncertainty around Academy-specific cert/IAM edges. |
| Features | HIGH | Clear internal scope alignment and strong consistency with architecture/risk research. |
| Architecture | HIGH | Locked topology and dependency-gated migration path are concrete and internally consistent. |
| Pitfalls | HIGH | Risks are specific, observable, and mapped to prevention/recovery phases with official references. |

**Overall confidence:** HIGH

### Gaps to Address

- **ACM certificate handling for EC2 wildcard TLS material:** validate exact operational path allowed in Academy before phase execution.
- **RDS Proxy availability/permissions:** treat as conditional optimization; baseline with direct DB + concurrency caps first.
- **Observability without CloudWatch-heavy tooling:** finalize minimal logging/health/runbook standard so incident response remains practical.
- **Quantitative load target for onboarding/matching bursts:** define explicit performance SLOs before final hardening.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- AWS official docs cited in those research files (Lambda, API Gateway, Route53, ACM, RDS, VPC endpoints, Terraform state/ops)

### Secondary (MEDIUM confidence)
- Mangum project documentation (adapter implementation details)
- Terraform/AWS provider release streams (version stability signals)

### Tertiary (LOW confidence)
- None identified in current research set.

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*
