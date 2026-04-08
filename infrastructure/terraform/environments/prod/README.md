# Terraform Production Environment Runbook

This directory contains the production Terraform root for MatchCota in AWS Academy (`us-east-1`).

## Prerequisites

1. Terraform `~> 1.14`
2. AWS CLI configured with active temporary AWS Academy credentials
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
5. Pause for registrar delegation after hosted zone NS output:
   - status: `blocked-waiting-for-delegation`
   - `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 900 --interval 30`
6. Run TLS readiness gate:
   - `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30`
7. Follow full operator details in `operations-runbook.md` (includes EC2 nginx Let's Encrypt issuance for apex/wildcard and timeout/resume behavior).

## Resume after credential expiry

1. Refresh AWS Academy credentials and export/update your AWS CLI session.
2. Re-run preflight checks:
   - `bash infrastructure/scripts/terraform-preflight.sh`
3. Resume from the failed/pending layer only:
   - `bash infrastructure/scripts/terraform-apply-layer.sh <foundation|network|data|runtime>`
4. Continue remaining layers in order until runtime is complete.
5. Re-run delegation + TLS gates if pending:
   - `bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 900 --interval 30`
   - `bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30`
6. Save command output logs for execution evidence and troubleshooting.

## Budget Check

Run budget gate before full apply or after estimate refresh:

- `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json`
- `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input <path-to-generated-cost-estimate.json>`
