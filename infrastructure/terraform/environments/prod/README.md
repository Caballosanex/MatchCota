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
2. Initialize Terraform backend:
   - `terraform -chdir=infrastructure/terraform/environments/prod init -reconfigure -backend-config="bucket=<state-bucket>" -backend-config="dynamodb_table=<lock-table>" -backend-config="region=us-east-1"`
3. Run smoke harness (includes DNS/TLS readiness stages):
   - `bash infrastructure/scripts/terraform-smoke.sh`
4. Apply layers in order:
    - `bash infrastructure/scripts/terraform-apply-layer.sh foundation`
    - `bash infrastructure/scripts/terraform-apply-layer.sh network`
    - `bash infrastructure/scripts/terraform-apply-layer.sh data`
    - `bash infrastructure/scripts/terraform-apply-layer.sh runtime`
5. Verify Phase 3 private data-plane state (RDS/S3/endpoint):
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_db_instance.postgres | grep -E "postgres|15|db.t3.micro|allocated_storage\s+=\s+20|backup_retention_period\s+=\s+7|multi_az\s+=\s+false|publicly_accessible\s+=\s+false"`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_s3_bucket_public_access_block.uploads | grep -E "block_public_acls\s+=\s+true|ignore_public_acls\s+=\s+true|block_public_policy\s+=\s+true|restrict_public_buckets\s+=\s+true"`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_vpc_endpoint.s3_gateway | grep -E "com.amazonaws.us-east-1.s3|Gateway"`
6. Pause for registrar delegation after hosted zone NS output:
    - status: `blocked-waiting-for-delegation`
    - `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 900 --interval 30`
7. Run TLS readiness gate:
    - `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30`
8. Follow full operator details in `operations-runbook.md` (includes EC2 nginx Let's Encrypt issuance for apex/wildcard and timeout/resume behavior).

## Resume after credential expiry

1. Refresh AWS Academy credentials and export/update your AWS CLI session.
   - If running commands manually, set the expected profile first: `export AWS_PROFILE=matchcota`
2. Re-run preflight checks:
   - `bash infrastructure/scripts/terraform-preflight.sh`
3. Re-run smoke harness before any apply resume:
   - `bash infrastructure/scripts/terraform-smoke.sh`
4. Resume from the failed/pending layer only:
    - `bash infrastructure/scripts/terraform-apply-layer.sh <foundation|network|data|runtime>`
5. If private data-plane work is pending, rerun and verify data layer:
   - `bash infrastructure/scripts/terraform-apply-layer.sh data`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_db_instance.postgres | grep -E "db.t3.micro|backup_retention_period\s+=\s+7"`
   - `terraform -chdir=infrastructure/terraform/environments/prod state show aws_vpc_endpoint.s3_gateway | grep -E "com.amazonaws.us-east-1.s3"`
6. Continue remaining layers in order until runtime is complete.
7. Re-run delegation + TLS gates if pending:
    - `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 900 --interval 30`
    - `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30`
8. Save command output logs for execution evidence and troubleshooting.

## Post-reset recovery quick-start (run in this exact order)

Use this command order after lab reset or full redeploy, keeping `AWS_PROFILE=matchcota` in `us-east-1`.

1. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-preflight.sh`
2. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh foundation`
3. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh network`
4. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh data`
5. `AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh runtime`
6. `AWS_PROFILE=matchcota DB_PASSWORD='<rds-password>' APP_SECRET_KEY='<fastapi-secret-key>' JWT_SECRET_KEY='<jwt-secret-key>' bash infrastructure/scripts/deploy-backend.sh`
7. `AWS_PROFILE=matchcota FRONTEND_HOST='<frontend-ec2-host-or-ip>' bash infrastructure/scripts/deploy-frontend.sh`
8. `AWS_PROFILE=matchcota bash infrastructure/scripts/post-deploy-readiness.sh`
9. `AWS_PROFILE=matchcota bash infrastructure/scripts/production-data-audit.sh`
10. Complete owner evidence in `.planning/phases/06-production-verification-operations-runbook/06-HUMAN-UAT.md`

Required deploy variables in this sequence: `DB_PASSWORD`, `APP_SECRET_KEY`, `JWT_SECRET_KEY`, and `FRONTEND_HOST`.

AWS Academy constraints remain mandatory during recovery: no CloudFront, CloudWatch, SES, NAT Gateway, or Multi-AZ RDS assumptions.

## Budget Check

Run budget gate before full apply or after estimate refresh:

- `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json`
- `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input <path-to-generated-cost-estimate.json>`
