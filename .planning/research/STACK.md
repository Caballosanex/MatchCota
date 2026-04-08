# Stack Research

**Domain:** AWS production deployment stack for existing FastAPI + React multi-tenant SaaS (MatchCota)
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Terraform CLI | `~> 1.14` | Infrastructure as Code | 1.14 is current stable (1.15 is beta). Best balance of mature behavior and recent provider compatibility for AWS lab rebuilds. |
| Terraform AWS Provider | `~> 6.39` | Manage AWS resources | Current provider line with up-to-date API Gateway v2, Lambda, Route53, ACM, RDS, and VPC resources. |
| AWS Lambda Python runtime | `python3.13` | FastAPI runtime via Mangum | AL2023-based runtime with longer support horizon than Python 3.11; better 2026 default for new serverless deploys. |
| FastAPI + Mangum | FastAPI existing + `mangum>=0.19,<0.20` | Adapt existing ASGI app to API Gateway HTTP API | Officially standard adapter pattern for ASGI on Lambda; minimal rewrite from current backend. |
| API Gateway HTTP API (Regional) | v2 HTTP API + payload format `2.0` | Public API edge + custom domain | Lower cost/simpler than REST API; fully compatible with Lambda proxy integration and custom domain `api.matchcota.tech`. |
| Amazon RDS PostgreSQL | PostgreSQL 15 (single-AZ) | Primary relational data | Matches existing app + budget/lab constraints; proven integration path from Lambda in VPC. |
| EC2 + nginx | Amazon Linux 2023 + nginx 1.26+ | Static SPA hosting + wildcard host handling | Required by locked architecture; simple, low-cost, predictable under Academy constraints. |
| S3 + Gateway VPC Endpoint | S3 standard + `com.amazonaws.us-east-1.s3` gateway endpoint | Object storage from private Lambda subnets without NAT | AWS-documented no-NAT pattern; endpoint routes S3 traffic privately and has no endpoint-hourly cost. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SQLAlchemy | existing `2.0.x` | DB connection/session management | Keep current ORM; tune pool settings specifically for Lambda concurrency behavior. |
| psycopg2-binary | existing `2.9.x` | PostgreSQL driver | Keep for minimum migration work; build wheels inside Linux-compatible packaging container. |
| boto3 | pin explicitly in package (do not rely on runtime copy) | S3 operations from Lambda | AWS recommends packaging your own SDK dependencies to avoid runtime version drift. |
| pydantic-settings | existing `2.x` | Environment configuration | Keep centralized env configuration for Lambda + EC2 with per-environment vars. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `terraform fmt/validate/plan` + remote state backend | IaC quality and resumability | Use S3 backend + DynamoDB lock table to survive expiring Academy credentials and interrupted applies. |
| `pip-tools` (or uv lock equivalent) | Reproducible Python dependency locking | Add lock workflow for Lambda package reproducibility; current backend has no hash-locked file. |
| Docker build container for Lambda artifact | Deterministic Linux wheel build | Build zip inside `public.ecr.aws/lambda/python:3.13` or AL2023-compatible image; never package on macOS host directly. |

## Exact Terraform/Module Recommendations

Use **small internal modules** (in-repo) instead of large opinionated community modules, because Academy constraints and locked architecture require tight control.

Recommended module layout:

1. `modules/network`
   - VPC, 2 public subnets (EC2), 2 private app subnets (Lambda), 2 private DB subnets (RDS), route tables
   - S3 gateway endpoint + route table associations
2. `modules/data`
   - RDS PostgreSQL instance, DB subnet group, DB SG
3. `modules/compute_ec2_frontend`
   - EC2 instance, EIP, SG, user_data for nginx hardening + static deploy path
4. `modules/lambda_api`
   - Lambda function, Lambda permission for API Gateway, SG + VPC config, env vars
5. `modules/apigw`
   - HTTP API, routes, integrations, stage, custom domain, API mapping
6. `modules/dns_tls`
   - Route53 hosted zone records, ACM certificate(s), validation records

Provider pins:

```hcl
terraform {
  required_version = "~> 1.14.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.39"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.5"
    }
  }
}
```

## Lambda Packaging Strategy (FastAPI + Mangum)

Recommended for this project: **zip package + deterministic Dockerized build**.

1. Add `handler.py`:
   - `from app.main import app`
   - `from mangum import Mangum`
   - `handler = Mangum(app, lifespan="off")`
2. Build artifact in Linux container (AL2023/Python 3.13 compatible).
3. Vendor all deps (including `boto3`) into package.
4. Zip with flat root for handler and site-packages.
5. Deploy via Terraform `aws_lambda_function` using S3 object or local filename.

Why this over container-image Lambda:
- Smaller cognitive overhead for current team.
- Works well with Academy constraints.
- Faster iteration for existing Python monolith adaptation.

## API Gateway Custom Domain + ACM Setup

For locked architecture (`api.matchcota.tech`):

1. Request ACM cert in **us-east-1** including SAN `api.matchcota.tech` (and optionally root/wildcard SANs if you want one cert strategy).
2. Validate via Route53 DNS records (`aws_acm_certificate_validation`).
3. Create API Gateway **Regional** domain (`aws_apigatewayv2_domain_name`) with TLS 1.2.
4. Map stage with `aws_apigatewayv2_api_mapping`.
5. Create Route53 alias A/AAAA for `api.matchcota.tech` -> API Gateway regional domain target.

Payload format: use Lambda proxy `2.0` unless you need `rawPath` mapping behavior from v1.0.

## ACM Handling for EC2/nginx (Wildcard Frontend)

Because architecture requires wildcard tenant hosts on EC2 nginx:

- Request cert covering: `matchcota.tech` + `*.matchcota.tech`.
- Use DNS validation in Route53.
- Install cert/key on nginx (exportable certificate path if available in your ACM/Lab policy), or fallback to externally issued wildcard cert managed outside ACM import/export flow.

Operational note: keep private key out of repo; provision via secure bootstrapping step in EC2 user-data or post-provision secret copy.

## EC2/nginx Hardening Basics (Minimal but required)

1. Security group ingress: only `80/443` from internet; SSH restricted to maintainer IP.
2. OS hardening: automatic security updates, disable password auth (SSH key only), least packages installed.
3. nginx:
   - force HTTPS redirect
   - `server_name matchcota.tech *.matchcota.tech`
   - strong TLS ciphers/protocols (TLS1.2+)
   - security headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
   - SPA fallback: `try_files $uri /index.html`
4. File permissions: frontend build owned by root, nginx read-only path.
5. Access/error logs retained locally for troubleshooting (since CloudWatch unavailable by constraint).

## DB Connectivity Pattern from Lambda (No NAT, No RDS Proxy by default)

Given constraints (no custom IAM roles + lab simplicity):

1. Lambda in private app subnets; RDS in private DB subnets (same VPC).
2. SG rules:
   - Lambda SG egress to RDS SG port 5432
   - RDS SG ingress from Lambda SG port 5432
3. SQLAlchemy engine created at module import time (reuse across warm invocations).
4. Conservative pooling to protect small RDS instance:
   - `pool_size=1`
   - `max_overflow=2`
   - `pool_pre_ping=True`
   - `pool_recycle=300`
5. Set Lambda reserved concurrency (e.g., 5–20) to cap DB connection pressure.

Tradeoff:
- Direct DB connections are simpler and IAM-light.
- Less burst-resilient than RDS Proxy, but better fit for Academy constraints.

## Installation

```bash
# Terraform toolchain
brew install terraform
terraform version

# Python dependencies for Lambda adaptation
pip install "mangum>=0.19,<0.20" "pip-tools>=7.4"

# Build Lambda package in Linux-compatible container (example)
docker run --rm -v "$PWD/backend:/var/task" public.ecr.aws/lambda/python:3.13 \
  /bin/bash -lc "pip install -r requirements.txt -t package && cp handler.py package/ && cd package && zip -r /var/task/lambda.zip ."
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| HTTP API + Lambda proxy | REST API | Only if you require API keys/usage plans/WAF/private API features unavailable in HTTP API. |
| Direct Lambda->RDS connections with strict concurrency cap | RDS Proxy | Use only if Lab permissions allow required IAM/Secrets setup and you observe connection saturation. |
| Internal focused Terraform modules | Large community all-in-one AWS modules | Use only if team later needs faster expansion and has fewer account constraints. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| CloudFront | Explicitly out-of-scope/blocked in Academy constraints for this milestone | EC2 nginx direct delivery + Route53 wildcard DNS |
| NAT Gateway | Unnecessary cost for this topology; S3 can be private via gateway endpoint | S3 Gateway VPC endpoint + private route table entries |
| CloudWatch-dependent architecture decisions | Service use is constrained/disabled in this environment | Local nginx/app logs + manual runbooks for lab operations |
| SES-based workflows | Blocked/unavailable in current lab constraints | Defer email features; keep SMTP disabled for prod-lab milestone |
| Runtime Route53 tenant record mutation | Operationally brittle + unnecessary with wildcard DNS | Single wildcard DNS strategy + tenant resolution in app layer |
| Containerized backend on EC2 for prod | Violates locked target architecture | API Gateway HTTP API + Lambda (Mangum) |
| Custom IAM role creation | Not allowed in Academy Lab | Reuse LabRole/LabInstanceProfile and design around it |

## Stack Patterns by Variant

**If Lambda package size nears limits (50MB zipped / 250MB unzipped):**
- Move heavy deps into one Lambda Layer.
- Keep app code zip small for faster deploys.

**If RDS connection exhaustion appears in load tests:**
- First lower Lambda reserved concurrency and pool size.
- Then evaluate RDS Proxy only if lab IAM/Secrets permissions prove available.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Lambda `python3.13` | Mangum + FastAPI ASGI | Preferred 2026 runtime target on AL2023. |
| API Gateway HTTP API payload `2.0` | Mangum Lambda handler | Standard modern event format. |
| Terraform `~>1.14` | AWS Provider `~>6.39` | Stable pair for current AWS resource coverage. |
| SQLAlchemy 2.x | psycopg2-binary 2.9.x | Keep current app compatibility; test on Linux-built wheel artifact. |

## Risks & Tradeoffs

1. **ACM export-to-EC2 path uncertainty in Academy lab policies** (MEDIUM): verify early whether exportable cert workflow is permitted.
2. **No CloudWatch** reduces operational visibility (HIGH): compensate with strict health checks and simple runbooks.
3. **No custom IAM roles** can block optional optimizations (RDS Proxy, advanced automation) (HIGH): plan direct patterns first.
4. **Temporary credentials** can interrupt applies (HIGH): use remote state + short, modular Terraform applies.

## Constraint Compatibility Check (AWS Academy)

- Locked architecture preserved: **YES**
- Route53 wildcard DNS used (no per-tenant DNS mutation): **YES**
- EC2 nginx static frontend retained: **YES**
- API Gateway HTTP API + Lambda/Mangum retained: **YES**
- RDS private subnet retained: **YES**
- S3 through Gateway endpoint, no NAT: **YES**
- No CloudFront/CloudWatch/SES/custom IAM roles in design: **YES**

## Sources

- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html (**HIGH**)
- Lambda VPC configuration/best practices: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html (**HIGH**)
- Lambda best practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html (**HIGH**)
- Lambda + RDS guidance: https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html (**HIGH**)
- RDS connectivity patterns: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/lambda-rds-connect.html (**HIGH**)
- Lambda packaging (.zip Python): https://docs.aws.amazon.com/lambda/latest/dg/python-package.html (**HIGH**)
- Lambda limits: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html (**HIGH**)
- API Gateway HTTP API Lambda integration: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html (**HIGH**)
- API Gateway custom domains (HTTP APIs): https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-custom-domain-names.html (**HIGH**)
- API Gateway REST vs HTTP tradeoffs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html (**HIGH**)
- ACM public certificates/wildcards/exportability: https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html (**HIGH**)
- VPC gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html (**HIGH**)
- S3 bucket policy with VPC endpoints: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html (**HIGH**)
- Mangum docs: https://mangum.fastapiexpert.com/ (**MEDIUM**, project docs)
- Terraform releases (stability signal): https://github.com/hashicorp/terraform/releases (**MEDIUM**)
- Terraform AWS provider releases (stability signal): https://github.com/hashicorp/terraform-provider-aws/releases (**MEDIUM**)

---
*Stack research for: MatchCota AWS production deployment under AWS Academy constraints*
*Researched: 2026-04-08*
