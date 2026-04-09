---
phase: 04-lambda-api-runtime-trusted-onboarding-backend
plan: 01
subsystem: infra
tags: [terraform, lambda, apigatewayv2, route53, runtime]
requires:
  - phase: 02.1-codify-tls-bootstrap-resources-fully-in-terraform-api-custom
    provides: API custom-domain bootstrap resources and mapping contract
provides:
  - Lambda runtime infrastructure contract for backend deployment artifact execution
  - API Gateway HTTP API integration, routes, stage, and invoke permissions for Lambda
  - Deterministic runtime outputs for deployment and smoke validation
affects: [phase-04-runtime-cutover, backend-deploy-runbook, infra-smoke]
tech-stack:
  added: [hashicorp/archive provider]
  patterns: [backend-free Terraform validation clone, API Gateway HTTP proxy integration to Lambda]
key-files:
  created:
    - infrastructure/terraform/environments/prod/tests/test_lambda_runtime_contract.py
    - .planning/phases/04-lambda-api-runtime-trusted-onboarding-backend/04-01-SUMMARY.md
  modified:
    - infrastructure/terraform/environments/prod/variables.tf
    - infrastructure/terraform/environments/prod/locals.tf
    - infrastructure/terraform/environments/prod/main.tf
    - infrastructure/terraform/environments/prod/outputs.tf
    - infrastructure/terraform/environments/prod/versions.tf
key-decisions:
  - "Runtime API mapping now defaults to the Terraform-managed HTTP API when no external api_gateway_http_api_id is supplied."
  - "Lambda artifact is packaged by Terraform archive provider from a configurable artifact path to keep deploy contract explicit."
patterns-established:
  - "Pattern: HTTP API resource + AWS_PROXY integration + ANY root/proxy routes + $default stage for resilient runtime routing"
  - "Pattern: Lambda invoke permission scoped to API Gateway principal and API execution ARN"
requirements-completed: [INFRA-12]
duration: 16min
completed: 2026-04-09
---

# Phase 04 Plan 01: Lambda API Runtime Terraform Contract Summary

**Terraform now provisions the production Lambda runtime and HTTP API proxy path behind `api.matchcota.tech`, with deterministic outputs for deploy and smoke orchestration.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-09T10:52:43Z
- **Completed:** 2026-04-09T11:08:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added Terraform-managed Lambda runtime resource contract (artifact, handler, runtime, VPC wiring, env map, execution role resolution).
- Added API Gateway HTTP API runtime graph with `AWS_PROXY` integration, `ANY /` + `ANY /{proxy+}` routes, `$default` stage, and API Gateway invoke permission.
- Published runtime outputs for downstream deployment/runbook usage (Lambda name/ARN, HTTP API ID, stage, invoke URL, and custom-domain mapping signal).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Lambda + HTTP API runtime Terraform resources (per D-01, D-02)**
   - `8bfddd4` (test): RED TDD contract tests for runtime resources/variables
   - `3494e60` (feat): runtime Terraform implementation (Lambda/API/route/stage/permission + vars/locals/provider)
2. **Task 2: Publish runtime outputs and custom-domain linkage contract**
   - `8850b47` (feat): runtime output surface and mapping linkage signal

## Files Created/Modified
- `infrastructure/terraform/environments/prod/tests/test_lambda_runtime_contract.py` - TDD contract checks for required runtime resources/variables.
- `infrastructure/terraform/environments/prod/variables.tf` - runtime variable contract for artifact/handler/runtime/timeout/memory/env/VPC config.
- `infrastructure/terraform/environments/prod/locals.tf` - derived runtime role/subnet/SG/API ID resolution locals.
- `infrastructure/terraform/environments/prod/main.tf` - Lambda + HTTP API integration, routes, stage, invoke permission, and mapping hookup.
- `infrastructure/terraform/environments/prod/versions.tf` - added `hashicorp/archive` provider requirement.
- `infrastructure/terraform/environments/prod/outputs.tf` - runtime deploy/smoke output contract.

## Decisions Made
- Bound API mapping to runtime stage resource (`aws_apigatewayv2_stage.runtime_default`) so mapping always tracks deployed stage name.
- Kept custom-domain resources from Phase 02.1 intact; runtime work only links mapping to the runtime API, avoiding alternate domain stacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Terraform validate command required AWS credentials despite `-backend=false` in the live env directory**
- **Found during:** Task 1 verification
- **Issue:** `terraform init -backend=false` in the real prod env failed with `No valid credential sources found` due provider credential resolution in this environment.
- **Fix:** Used the established backend-free temporary clone pattern (`cp *.tf` to temp dir, remove `backend.tf`, then `terraform init -backend=false && terraform validate && terraform fmt -check`) to verify configuration deterministically without shared backend/account coupling.
- **Files modified:** None (verification workflow adaptation only)
- **Verification:** Temporary-clone `terraform validate` succeeded.
- **Committed in:** `3494e60` (task commit context)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep; adaptation was verification-only and aligned with existing project smoke conventions.

## Issues Encountered
- Direct `terraform init -backend=false` in the live environment attempted AWS credential resolution; verification was completed using backend-free temp clone mode.

## User Setup Required
None - no external service configuration required for this plan execution artifact.

## Next Phase Readiness
- Runtime infrastructure contract for INFRA-12 is now codified and validated.
- Downstream backend packaging/deploy steps can consume Lambda/API outputs directly.

## Self-Check: PASSED

- FOUND: .planning/phases/04-lambda-api-runtime-trusted-onboarding-backend/04-01-SUMMARY.md
- FOUND: 8bfddd4
- FOUND: 3494e60
- FOUND: 8850b47
