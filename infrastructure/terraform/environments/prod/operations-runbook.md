# Terraform Operations Runbook (Production)

This runbook is the operator guide for baseline Terraform provisioning in AWS Academy (`us-east-1`) with resumable execution and strict guardrails.

## Prerequisites

1. Terraform `~> 1.14` and AWS CLI are installed.
2. AWS Academy temporary credentials are active in the current shell/profile.
   - Standard profile for this project: `matchcota`.
   - Script default: `terraform-preflight.sh` and `terraform-smoke.sh` auto-export `AWS_PROFILE=matchcota` when unset.
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

   Runtime layer includes Terraform-owned frontend edge resources (`aws_security_group.frontend_edge`, `data.aws_ssm_parameter.frontend_ami`, `aws_instance.frontend_edge`, `aws_eip.frontend_edge`, `aws_eip_association.frontend_edge`).
   Terraform user-data establishes nginx baseline; no manual post-apply host bootstrap step is part of the normal recovery contract.

5. Verify Phase 3 private data-plane contract before release decision:

   ```bash
   terraform -chdir=infrastructure/terraform/environments/prod state show aws_db_instance.postgres | grep -E "engine\s+=\s+\"postgres\"|engine_version\s+=\s+\"15\"|instance_class\s+=\s+\"db.t3.micro\"|backup_retention_period\s+=\s+7|allocated_storage\s+=\s+20|multi_az\s+=\s+false|publicly_accessible\s+=\s+false"
   terraform -chdir=infrastructure/terraform/environments/prod state show aws_s3_bucket_public_access_block.uploads | grep -E "block_public_acls\s+=\s+true|ignore_public_acls\s+=\s+true|block_public_policy\s+=\s+true|restrict_public_buckets\s+=\s+true"
   terraform -chdir=infrastructure/terraform/environments/prod state show aws_vpc_endpoint.s3_gateway | grep -E "service_name\s+=\s+\"com.amazonaws.us-east-1.s3\"|vpc_endpoint_type\s+=\s+\"Gateway\""
   ```

   If any command above fails, stop rollout and re-run `bash infrastructure/scripts/terraform-apply-layer.sh data`.

6. Capture Route53 delegation checkpoint after hosted zone output:

   ```bash
   terraform -chdir=infrastructure/terraform/environments/prod output route53_hosted_zone_name_servers
   ```

   - Update DotTech registrar NS records with the exact Route53 values.
   - While waiting for propagation, record status as `blocked-waiting-for-delegation`.
   - Resume gate (must pass before continuing):

     ```bash
     bash infrastructure/scripts/dns-delegation-check.sh \
       --domain matchcota.tech \
       --wildcard-sample smoke.matchcota.tech \
       --api-host api.matchcota.tech \
       --timeout 900 \
       --interval 30
     ```

   - Timeout policy: if the script exits `2`, treat this as propagation wait, keep status `blocked-waiting-for-delegation`, and rerun the same command after registrar update confirmation.

7. Validate TLS readiness after delegation passes:

   ```bash
   bash infrastructure/scripts/tls-readiness-check.sh \
     --apex matchcota.tech \
     --wildcard-sample smoke.matchcota.tech \
     --api api.matchcota.tech \
     --timeout 900 \
     --interval 30
   ```

   - Timeout policy: if the script exits `2`, continue certificate issuance/attachment steps below, then rerun until PASS.

8. Save command output logs for each layer, smoke run, data-plane verification, delegation check, and TLS check as execution evidence.

## Recovery evidence gates (mandatory)

Capture timestamped command output for every gate below before marking recovery complete:

1. `bash infrastructure/scripts/terraform-preflight.sh`
2. `bash infrastructure/scripts/terraform-smoke.sh`
3. Ordered layer applies:
   - `bash infrastructure/scripts/terraform-apply-layer.sh foundation`
   - `bash infrastructure/scripts/terraform-apply-layer.sh network`
   - `bash infrastructure/scripts/terraform-apply-layer.sh data`
   - `bash infrastructure/scripts/terraform-apply-layer.sh runtime`
4. `bash infrastructure/scripts/deploy-frontend.sh` (must include route contract checks)
5. `bash infrastructure/scripts/post-deploy-readiness.sh`
6. `bash infrastructure/scripts/production-data-audit.sh`

Do not skip evidence capture for any gate. Missing artifacts invalidate DR equivalence proof.

## Edge TLS issuance (EC2 nginx)

Use Let's Encrypt for `matchcota.tech` and `*.matchcota.tech` at the nginx edge.

Wildcard issuance requires DNS-01 challenge. `certbot --nginx` is not valid for wildcard certificates.

1. SSH to the frontend EC2 instance serving nginx.
2. Install certbot if not present.
3. Issue edge certificate with DNS-01:

   ```bash
   sudo certbot certonly --manual --preferred-challenges dns --agree-tos --email <ops-email> --manual-public-ip-logging-ok -d matchcota.tech -d '*.matchcota.tech'
   ```

4. Configure nginx TLS paths to `/etc/letsencrypt/live/matchcota.tech/fullchain.pem` and `/etc/letsencrypt/live/matchcota.tech/privkey.pem`.
5. Reload nginx and verify HTTPS handshake for apex and wildcard sample host.
6. Confirm API domain certificate remains ACM-managed on API Gateway (`api.matchcota.tech`) per split strategy.

> Milestone note: automated renewal is intentionally out of scope for this phase window; renewals are operator-managed for the current lifecycle.

## Expired credential recovery

1. Refresh AWS Academy credentials.
2. Update environment/profile used by AWS CLI.
   - For manual commands outside scripts: `export AWS_PROFILE=matchcota`
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
7. If pending/failed scope includes private data-plane resources, rerun and confirm:

   ```bash
   bash infrastructure/scripts/terraform-apply-layer.sh data
   terraform -chdir=infrastructure/terraform/environments/prod state show aws_db_instance.postgres | grep -E "db.t3.micro|backup_retention_period\s+=\s+7"
   terraform -chdir=infrastructure/terraform/environments/prod state show aws_vpc_endpoint.s3_gateway | grep -E "com.amazonaws.us-east-1.s3"
   ```

8. If previously paused at delegation checkpoint, rerun `dns-delegation-check.sh` and `tls-readiness-check.sh` before proceeding.

## Post-reset recovery and launch verification

Use this sequence after AWS Academy lab reset or whenever production needs full recovery verification.

- Keep `AWS_PROFILE=matchcota` and region `us-east-1` for all commands.
- Preserve locked AWS Academy constraints throughout recovery: no CloudFront, CloudWatch, SES, NAT Gateway, or Multi-AZ RDS assumptions.

1. Run preflight checks:

   ```bash
   AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-preflight.sh
   ```

2. Apply Terraform layers in strict order (resume-safe):

   ```bash
   AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh foundation
   AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh network
   AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh data
   AWS_PROFILE=matchcota bash infrastructure/scripts/terraform-apply-layer.sh runtime
   ```

3. Publish backend Lambda runtime (required secrets in shell):

   ```bash
   export AWS_PROFILE=matchcota
   export AWS_REGION=us-east-1
   export DB_PASSWORD='<rds-password>'
   export APP_SECRET_KEY='<fastapi-secret-key>'
   export JWT_SECRET_KEY='<jwt-secret-key>'
   bash infrastructure/scripts/deploy-backend.sh
   ```

4. Publish frontend static SPA (required host contract):

   ```bash
   export AWS_PROFILE=matchcota
   export AWS_REGION=us-east-1
   bash infrastructure/scripts/deploy-frontend.sh
   ```

   `deploy-frontend.sh` resolves `FRONTEND_HOST` from Terraform output `frontend_edge_host_for_deploy` by default. Set `FRONTEND_HOST` only for explicit operator override.

   Transport policy remains SSM-first with SSH fallback (`DEPLOY_TRANSPORT=auto`). Both channels must pass the same `verify_host_routing_contracts` and preboot contract checks.

5. Run post-deploy readiness gate (DNS → TLS → API):

   ```bash
   AWS_PROFILE=matchcota bash infrastructure/scripts/post-deploy-readiness.sh
   ```

6. Run production fixture leakage audit:

   ```bash
   AWS_PROFILE=matchcota bash infrastructure/scripts/production-data-audit.sh
   ```

7. Complete owner launch UAT evidence capture:

   ```bash
   # Fill the evidence artifact with timestamps, pass/fail, and notes.
   # This is owner-run verification of real registration -> tenant login flow.
   ${EDITOR:-vi} .planning/phases/06-production-verification-operations-runbook/06-HUMAN-UAT.md
   ```

   Use the checklist in `06-HUMAN-UAT.md` to prove `https://matchcota.tech/register-tenant` → `https://{slug}.matchcota.tech/login` works with real credentials (no fixture/demo identities).

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
