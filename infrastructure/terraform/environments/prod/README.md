# Terraform Production Environment Runbook

This directory contains the production Terraform root for MatchCota in AWS Academy (`us-east-1`).

## Prerequisites

1. Terraform `~> 1.14`
2. AWS CLI configured with active temporary AWS Academy credentials
   - Default profile used by project scripts: `matchcota` (scripts auto-set `AWS_PROFILE=matchcota` when unset)
3. Region set to `us-east-1`

## First Run

1. Run preflight checks:
   - `bash infrastructure/scripts/terraform-preflight.sh`
2. Bootstrap remote backend resources before prod-root init:
   - `eval "$(bash infrastructure/scripts/terraform-bootstrap-backend.sh)"`
3. Initialize Terraform backend:
   - `terraform -chdir=infrastructure/terraform/environments/prod init -reconfigure -backend-config="bucket=${TF_BACKEND_BUCKET}" -backend-config="dynamodb_table=${TF_BACKEND_DYNAMODB_TABLE}" -backend-config="region=${TF_BACKEND_REGION:-us-east-1}"`
4. Run smoke harness (includes DNS/TLS readiness stages):
   - `bash infrastructure/scripts/terraform-smoke.sh`
5. Apply layers in order:
      - `bash infrastructure/scripts/terraform-apply-layer.sh foundation`
      - `bash infrastructure/scripts/terraform-apply-layer.sh network`
      - `bash infrastructure/scripts/terraform-apply-layer.sh data`
      - `bash infrastructure/scripts/terraform-apply-layer.sh runtime`
   - Runtime now owns frontend edge lifecycle (`aws_security_group.frontend_edge`, `aws_instance.frontend_edge`, `aws_eip.frontend_edge`, `aws_eip_association.frontend_edge`) and emits `frontend_edge_host_for_deploy` for deterministic deploy targeting.
   - No manual post-apply host bootstrap is part of the normal path. Terraform user-data establishes nginx baseline before deploy scripts publish SPA artifacts.
6. Verify Phase 3 private data-plane state (RDS/S3/endpoint):
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_db_instance.postgres | grep -E "postgres|15|db.t3.micro|allocated_storage\s+=\s+20|backup_retention_period\s+=\s+7|multi_az\s+=\s+false|publicly_accessible\s+=\s+false"`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_s3_bucket_public_access_block.uploads | grep -E "block_public_acls\s+=\s+true|ignore_public_acls\s+=\s+true|block_public_policy\s+=\s+true|restrict_public_buckets\s+=\s+true"`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_vpc_endpoint.s3_gateway | grep -E "com.amazonaws.us-east-1.s3|Gateway"`
7. Pause for registrar delegation after hosted zone NS output:
    - status: `blocked-waiting-for-delegation`
    - `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 900 --interval 30`
8. Run TLS readiness gate:
    - `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30`
9. Follow full operator details in `operations-runbook.md` (includes EC2 nginx Let's Encrypt issuance for apex/wildcard and timeout/resume behavior).

## Resume after credential expiry

1. Refresh AWS Academy credentials and export/update your AWS CLI session.
   - If running commands manually, set the expected profile first: `export AWS_PROFILE=matchcota`
2. Re-run preflight checks:
   - `bash infrastructure/scripts/terraform-preflight.sh`
3. Inspect lock status before resume (manual break-glass only):
   - `aws dynamodb describe-table --table-name "${TF_BACKEND_DYNAMODB_TABLE}"`
4. Re-run smoke harness before any apply resume:
   - `bash infrastructure/scripts/terraform-smoke.sh`
5. Resume from the failed/pending layer only:
     - `bash infrastructure/scripts/terraform-apply-layer.sh <foundation|network|data|runtime>`
6. If private data-plane work is pending, rerun and verify data layer:
   - `bash infrastructure/scripts/terraform-apply-layer.sh data`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_db_instance.postgres | grep -E "db.t3.micro|backup_retention_period\s+=\s+7"`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_vpc_endpoint.s3_gateway | grep -E "com.amazonaws.us-east-1.s3"`
7. Continue remaining layers in order until runtime is complete.
8. Re-run delegation + TLS gates if pending:
     - `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 900 --interval 30`
     - `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30`
9. Save command output logs for execution evidence and troubleshooting.

## Post-reset recovery quick-start (run in this exact order)

Use this command order after lab reset or full redeploy, keeping `AWS_PROFILE=matchcota` in `us-east-1`.

1. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-preflight.sh`
2. `export AWS_PROFILE=matchcota && eval "$(bash infrastructure/scripts/terraform-bootstrap-backend.sh)"`
3. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh foundation`
4. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh network`
5. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh data`
6. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh runtime`
7. `AWS_PROFILE=matchcota bash infrastructure/scripts/deploy-backend.sh`
8. `AWS_PROFILE=matchcota bash infrastructure/scripts/deploy-frontend.sh`
9. `AWS_PROFILE=matchcota bash infrastructure/scripts/post-deploy-readiness.sh`
10. `AWS_PROFILE=matchcota bash infrastructure/scripts/production-data-audit.sh`
11. Complete owner evidence in `.planning/phases/06-production-verification-operations-runbook/06-HUMAN-UAT.md`

`deploy-frontend.sh` resolves the host from Terraform output `frontend_edge_host_for_deploy` by default. Set `FRONTEND_HOST` only as an explicit operator override.

Required deploy variables in this sequence: backend bootstrap outputs (`TF_BACKEND_BUCKET`, `TF_BACKEND_DYNAMODB_TABLE`) and standard AWS profile/region (`FRONTEND_HOST` remains optional override).

AWS Academy constraints remain mandatory during recovery: no CloudFront, CloudWatch, SES, NAT Gateway, or Multi-AZ RDS assumptions.

## Budget Check

Run budget gate before full apply or after estimate refresh:

- `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json`
- `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input <path-to-generated-cost-estimate.json>`
