# Terraform Operations Runbook (Production)

This runbook is the operator guide for baseline Terraform provisioning in AWS Academy (`us-east-1`) with resumable execution and strict guardrails.

## Prerequisites

1. Terraform `~> 1.14` and AWS CLI are installed.
2. AWS Academy temporary credentials are active in the current shell/profile.
3. Region is set to `us-east-1`.
4. Backend state resources are known (S3 bucket + DynamoDB lock table).

Preflight command:

```bash
bash infrastructure/scripts/terraform-preflight.sh
```

## Initial Apply

1. Run preflight and confirm PASS.
2. Initialize backend:

   ```bash
   terraform -chdir=infrastructure/terraform/environments/prod init -reconfigure \
     -backend-config="bucket=<state-bucket>" \
     -backend-config="dynamodb_table=<lock-table>" \
     -backend-config="region=us-east-1"
   ```

3. Run smoke verification (no mutations):

   ```bash
   bash infrastructure/scripts/terraform-smoke.sh
   ```

4. Run layered applies in strict order:

   ```bash
   bash infrastructure/scripts/terraform-apply-layer.sh foundation
   bash infrastructure/scripts/terraform-apply-layer.sh network
   bash infrastructure/scripts/terraform-apply-layer.sh data
   bash infrastructure/scripts/terraform-apply-layer.sh runtime
   ```

5. Save command output logs for each layer and smoke run as execution evidence.

## Expired credential recovery

1. Refresh AWS Academy credentials.
2. Update environment/profile used by AWS CLI.
3. Re-run preflight:

   ```bash
   bash infrastructure/scripts/terraform-preflight.sh
   ```

4. Re-run smoke harness to confirm readiness:

   ```bash
   bash infrastructure/scripts/terraform-smoke.sh
   ```

5. Resume from failed or pending layer only:

   ```bash
   bash infrastructure/scripts/terraform-apply-layer.sh <foundation|network|data|runtime>
   ```

6. Continue remaining layers in order.

## Rollback and drift response

Rules:

- Do not use `-lock=false` during plan/apply.
- Do not perform manual console edits for managed resources.
- Treat drift as code change: update Terraform source, then run plan/apply.

Commands:

```bash
terraform -chdir=infrastructure/terraform/environments/prod plan
terraform -chdir=infrastructure/terraform/environments/prod apply
```

If a single layer needs rollback, first inspect state and plan output, then target the corrective layer through `terraform-apply-layer.sh` after code correction.

## Compliance checks (IAM and forbidden services)

Before and after apply, verify:

- IAM constraints remain `LabRole` and `LabInstanceProfile`.
- Forbidden patterns are not enabled: `cloudfront`, `cloudwatch`, `ses`, `nat_gateway`, `rds_multi_az`.
- Budget gate passes before full apply:

  ```bash
  python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json
  ```

Capture command outputs for auditability at each critical checkpoint.
