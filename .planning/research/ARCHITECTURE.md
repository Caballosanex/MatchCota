# Architecture Research

**Domain:** MatchCota AWS production migration (dev/test → locked AWS topology)
**Researched:** 2026-04-08
**Confidence:** HIGH (locked constraints + AWS official docs + current codebase analysis)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                DNS + TLS EDGE                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  Route53 Hosted Zone                                                        │
│  - matchcota.tech (apex)                                                    │
│  - *.matchcota.tech (tenant wildcard)                                       │
│  - api.matchcota.tech (API custom domain)                                   │
│  ACM Certificates (DNS-validated)                                           │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐   ┌───────────────────────────▼───────────────────────┐
│ Frontend Delivery Plane                      │   │ API Plane                                            │
├──────────────────────────────────────────────┤   ├─────────────────────────────────────────────────────┤
│ EC2 + nginx static SPA                       │   │ API Gateway (Regional custom domain)                │
│ serves tenant-host-aware React build         │   │ → Lambda (FastAPI via Mangum)                       │
│ hosts: matchcota.tech + *.matchcota.tech     │   │ host/path routing + CORS boundary                    │
└───────────────┬──────────────────────────────┘   └───────────────┬─────────────────────────────────────┘
                │                                                  │
                │ API calls to api.matchcota.tech                 │
                │                                                  │
┌───────────────▼──────────────────────────────────────────────────▼──────────┐
│                             Application Data Plane                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Lambda in private subnets (VPC-attached)                                    │
│   ├─ PostgreSQL (RDS, private, single-AZ budget mode)                       │
│   └─ S3 uploads bucket via VPC Gateway Endpoint (no NAT required)           │
│ Tenant isolation at app layer: host/slug resolution + tenant_id scoping     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Route53 zone + records | Authoritative DNS for apex/wildcard/API names; registrar delegation target | Hosted zone records: `A/AAAA alias` for apex + wildcard to EC2 public endpoint, alias for `api` to API Gateway custom domain |
| ACM certificates | TLS termination material for frontend and API domains | DNS-validated certs for `matchcota.tech`, `*.matchcota.tech`, and API domain |
| Frontend host (EC2 nginx) | Serve SPA assets and preserve host header semantics for tenant UX | Immutable build artifact on EC2, nginx vhost for wildcard + HTTPS redirect |
| API Gateway custom domain | Stable external API contract and edge policy boundary | Regional API with `api.matchcota.tech`, stage mapping, optional disable default execute-api endpoint |
| Lambda (FastAPI+Mangum) | Stateless request execution, tenant/auth/business logic | Mangum handler, env-driven config, DB session lifecycle per invocation |
| RDS PostgreSQL | Persistent relational source of truth | Private subnet DB subnet group (2 AZ subnets required by RDS), SG-restricted to Lambda |
| S3 uploads bucket | Durable object storage for animal images/assets | Private bucket, key prefix by tenant, access only via backend path |
| S3 Gateway Endpoint | Private path from Lambda VPC to S3 without NAT | Gateway endpoint attached to private route tables + restrictive endpoint policy |

## Recommended Project Structure

```
infrastructure/terraform/
├── modules/
│   ├── dns/                     # Route53 zone records + registrar output values
│   ├── tls/                     # ACM cert requests + DNS validation records
│   ├── network/                 # VPC, subnets, route tables, SGs, S3 endpoint
│   ├── data/                    # RDS subnet group, parameter group, instance
│   ├── api/                     # API Gateway domain/mappings + Lambda integration
│   ├── frontend_host/           # EC2 nginx host + userdata/bootstrap
│   └── storage/                 # S3 bucket + bucket policy
└── environments/prod/
    ├── main.tf                  # module wiring in dependency order
    ├── variables.tf             # explicit env contracts
    ├── outputs.tf               # delegation, endpoints, validation URLs
    └── terraform.tfvars.example # reproducible operator input

backend/
├── app/main.py                  # FastAPI app factory; CORS by explicit allowed origins
├── app/lambda_handler.py        # Mangum adapter (new boundary)
├── app/services/tenants.py      # registration + admin bootstrap txn (no Route53 mutate)
└── app/services/storage.py      # S3-only prod upload strategy

frontend/
├── src/App.jsx                  # production route tree (dev/demo routes removed)
└── src/api/client.js            # API base + host-aware tenant header policy
```

### Structure Rationale

- **`modules/*` split by bounded responsibility** prevents mixing mutable infra concerns (DNS/TLS/network/data/api) and enables isolated plan/apply/checkpoint per slice.
- **`backend/app/lambda_handler.py` hard boundary** avoids leaking container assumptions into Lambda runtime.
- **`tenants.py` without DNS writes** keeps onboarding transactional in DB only; DNS is pre-provisioned wildcard infra.
- **frontend route cleanup in-place** ensures production artifact cannot expose dev diagnostics.

## Architectural Patterns

### Pattern 1: Host-Resolved Multi-Tenant Boundary

**What:** Resolve tenant by trusted host/subdomain and enforce `tenant_id` scoping in every domain query.
**When to use:** Every request touching tenant-owned data.
**Trade-offs:** Strong isolation with low infra complexity; requires strict host/header trust contract at edge.

**Example:**
```python
# FastAPI dependency sketch
tenant = resolve_tenant_from_host(request.headers["host"])
assert tenant.id == request.state.tenant_id
animals = db.query(Animal).filter(Animal.tenant_id == tenant.id).all()
```

### Pattern 2: Immutable Edge, Mutable Data

**What:** Deploy frontend artifacts and API infrastructure as immutable releases; only DB/S3 content mutates at runtime.
**When to use:** Production promotion from dev/test with rollback requirements.
**Trade-offs:** Safer rollback and reproducibility; requires artifact/version discipline.

**Example:**
```text
Release N: frontend bundle hash + lambda zip hash + terraform plan fingerprint
Rollback: re-point to Release N-1 artifacts, no data rollback unless migration required
```

### Pattern 3: Remove Infra Side Effects from Request Path

**What:** Tenant registration must not perform Route53 writes during API request.
**When to use:** Self-service onboarding with wildcard DNS already provisioned.
**Trade-offs:** Faster and more reliable onboarding; no per-tenant DNS customization in MVP.

## Data Flow

### Request Flow (tenant public/admin)

```
Browser (tenant host)
    ↓ HTTPS
EC2 nginx (serves SPA)
    ↓ HTTPS fetch to api.matchcota.tech
API Gateway custom domain
    ↓ integration
Lambda (FastAPI/Mangum)
    ↓ tenant/auth checks
RDS (tenant-scoped queries)
    ↓
JSON response → SPA render
```

### Onboarding Flow (new shelter)

1. User opens `matchcota.tech/register` (SPA on EC2).
2. SPA posts registration to `api.matchcota.tech/api/v1/tenants`.
3. Lambda validates slug uniqueness and creates **tenant + initial admin credentials atomically** (single transaction).
4. API returns success + login-ready credentials state.
5. User is redirected to `https://{slug}.matchcota.tech/login`.
6. Wildcard DNS already resolves; no Route53 mutation in request path.

### Upload Path Flow (animal images)

1. Admin on `{slug}.matchcota.tech` uploads image via admin UI.
2. UI sends authenticated request to API (`/api/v1/admin/upload`).
3. Lambda validates JWT tenant match + file constraints.
4. Lambda writes object to S3 key prefix `tenants/{tenant_id}/...` through S3 Gateway Endpoint route.
5. API stores/returns object URL reference; animal record update remains tenant-scoped in RDS.

### State Management (migration-specific)

```
Infra State: Terraform state (authoritative for AWS topology)
App State: RDS + S3 objects (authoritative for tenant/business data)
Release State: versioned frontend and lambda artifacts
```

## Dependency-Ordered Build Sequence (with Gates)

1. **Slice A — DNS authority + certificate prerequisites**
   - Build: Route53 hosted zone, registrar NS delegation checklist, ACM requests + DNS validation records.
   - Gate A (must pass):
     - NS delegation effective.
     - ACM certs move to `ISSUED`.
   - Rollback/Safety: keep old DNS zone untouched until validation is complete; do not cut apex/wildcard traffic yet.

2. **Slice B — Network + security baseline**
   - Build: VPC, public/private subnets, route tables, SGs, S3 Gateway Endpoint.
   - Gate B:
     - Private subnets have DB/Lambda reachability.
     - No NAT dependency introduced.
     - Endpoint route table associations verified.
   - Rollback/Safety: apply network in isolation first; tag all resources for deterministic destroy/recreate if misconfigured.

3. **Slice C — Data plane (RDS + S3)**
   - Build: RDS PostgreSQL (private), DB subnet group, parameter group, S3 bucket/policies.
   - Gate C:
     - Lambda SG can connect to DB port.
     - Alembic migration dry-run succeeds against RDS snapshot candidate.
     - S3 write/read via backend role path verified.
   - Rollback/Safety: snapshot before schema changes; keep migration scripts reversible where possible.

4. **Slice D — Backend runtime migration (Lambda/API Gateway)**
   - Build: Mangum handler, Lambda package/runtime, API Gateway integration, `api.matchcota.tech` mapping.
   - Gate D:
     - Health endpoint 200 via custom API domain.
     - CORS preflight + credentialed requests succeed for frontend origins.
     - Tenant mismatch auth tests fail correctly (expected 403/401).
   - Rollback/Safety: keep previous API stage/deployment; switch mapping only after smoke tests.

5. **Slice E — Frontend production host (EC2 nginx)**
   - Build: nginx TLS config, SPA artifact deploy, wildcard host handling.
   - Gate E:
     - `matchcota.tech` and `{testslug}.matchcota.tech` serve SPA over HTTPS.
     - No dev/demo routes bundled in production build.
     - API base points only to `api.matchcota.tech`.
   - Rollback/Safety: blue/green directory symlink or previous artifact retention for instant rollback.

6. **Slice F — Onboarding hardening + e2e production validation**
   - Build: atomic tenant+admin provisioning, abuse controls baseline (rate-limit/challenge), audit logs.
   - Gate F:
     - Real shelter registration creates tenant + admin login usable immediately.
     - New slug reachable without manual DNS ops.
     - Cross-tenant access attempts rejected.
   - Rollback/Safety: feature flag/guard on public registration endpoint while hardening completes.

## Validation Strategy by Architecture Slice

| Slice | Validation Type | Minimum Passing Criteria |
|------|------------------|--------------------------|
| A: DNS/TLS | Operational + DNS checks | `dig`/NS delegation correct; ACM `ISSUED`; cert SANs include wildcard/API |
| B: Network | Connectivity + policy tests | Lambda private subnet attachment works; RDS unreachable from public internet; S3 endpoint route active |
| C: Data | Migration + durability tests | Alembic upgrade succeeds; rollback tested on snapshot clone; S3 tenant-prefix policy enforced |
| D: API/Lambda | Contract + security tests | `/health` + core endpoints pass; CORS preflight OK; JWT tenant binding enforced |
| E: Frontend host | UX + routing tests | SPA fallback works for deep routes; wildcard host preserved; admin/public flows load |
| F: Onboarding/e2e | Business acceptance tests | Register → login → create animal → upload image → run matching end-to-end |

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| DotTech registrar | Manual NS delegation to Route53 | Human checkpoint; blocks go-live until propagated |
| Route53 | Hosted zone + alias records | Use alias for AWS targets; wildcard record enables tenant self-service |
| ACM | DNS validation CNAME records | Keep records persistent for auto-renewal |
| API Gateway | Regional custom domain + API mapping | Prefer disabling default execute-api endpoint after cutover |
| Lambda | VPC-attached function runtime | First ENI creation can add startup delay; warmup expectations needed |
| RDS PostgreSQL | Private DB endpoint | Use DNS endpoint, not fixed IP |
| S3 | Tenant-prefixed object storage | Access path through VPC endpoint, no NAT required |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| nginx SPA ↔ API Gateway | HTTPS JSON API | Strict CORS origin allowlist only |
| API route layer ↔ tenant/auth middleware | In-process dependency injection | Must enforce host-derived tenant trust |
| service layer ↔ DB | SQLAlchemy session | Every tenant-owned query includes tenant filter |
| service layer ↔ S3 | boto3 SDK | Key naming contract encodes tenant separation |

## Anti-Patterns (Do Not Use)

### Anti-Pattern 1: Per-tenant Route53 mutation during registration
**Why wrong:** Creates brittle onboarding, IAM coupling, and partial-failure states.
**Do instead:** Pre-provision wildcard DNS; registration only mutates app data.

### Anti-Pattern 2: Deploying dev/test routes and diagnostics to prod
**Why wrong:** Exposes internal surfaces and tenant-enumeration vectors.
**Do instead:** Build-time route pruning + production smoke test asserting route absence.

### Anti-Pattern 3: Treating Terraform apply as one-shot “big bang”
**Why wrong:** Credential expiration (AWS Academy) + high blast radius.
**Do instead:** Slice-wise apply with resumable state and explicit gates.

## Roadmap-Oriented Phase Decomposition Recommendation

1. **Foundation controls (DNS/TLS + network baseline)**
2. **Data plane provisioning (RDS/S3) + migration rehearsal**
3. **Backend Lambda/API transition + security contract tests**
4. **Frontend host cutover + route hardening**
5. **Onboarding transaction fix + production e2e acceptance**
6. **Stability pass (rollback drills + runbooks + budget guardrails)**

Dependency rationale: each phase unlocks the next with minimal rework and clear failure domains.

## Sources

- AWS API Gateway custom domains (Regional + wildcard considerations): https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html (HIGH)
- Route53 routing to API Gateway + alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-api-gateway.html (HIGH)
- ACM DNS validation and renewal behavior: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html (HIGH)
- Lambda VPC attachment behavior and constraints: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html (HIGH)
- S3 Gateway endpoint behavior/cost/limits: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html (HIGH)
- RDS in VPC subnet/security prerequisites: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html (HIGH)
- Project constraints and locked architecture inputs: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/STACK.md` (HIGH)

---
*Architecture research for: MatchCota AWS production migration*
*Researched: 2026-04-08*
