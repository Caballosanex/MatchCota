# Phase 01 Verification — Terraform Operations Baseline

This artifact maps phase requirements to executable checks and captures pass/fail outcomes for promotion readiness.

## Requirement-to-Command Coverage

| Requirement ID | Command | Expected Output |
|---|---|---|
| INFRA-01 | `bash infrastructure/scripts/terraform-smoke.sh` | All stages pass, exits 0 |
| SECU-01 | `terraform -chdir=infrastructure/terraform/environments/prod validate` | Guardrail resource validates LabRole/LabInstanceProfile constraints |
| SECU-02 | `terraform -chdir=infrastructure/terraform/environments/prod validate` | Forbidden service precondition remains enforced |
| SECU-03 | `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json` | `status=pass`, threshold reported |
| VERI-01 | `bash infrastructure/scripts/terraform-preflight.sh` then `bash infrastructure/scripts/terraform-smoke.sh` | Recovery-safe checks pass after credential refresh |

## Mandatory Verification Sequence

1. Syntax check:
   - `bash -n infrastructure/scripts/terraform-smoke.sh`
2. Smoke harness:
   - `bash infrastructure/scripts/terraform-smoke.sh`
3. Budget guard:
   - `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json`

## Evidence Capture Requirements

- Save stdout/stderr output for each command above.
- Record execution timestamp, operator identity, and shell environment region.
- If any command fails, mark phase as not ready and attach remediation notes.

## Pass/Fail Checklist

| Check | Command | Status (Pass/Fail) | Evidence Link/Notes |
|---|---|---|---|
| Smoke script syntax valid | `bash -n infrastructure/scripts/terraform-smoke.sh` | Pass | |
| Smoke script execution | `bash infrastructure/scripts/terraform-smoke.sh` | Pass | |
| Budget threshold check | `python3 infrastructure/scripts/terraform-budget-check.py --max-usd 50 --input infrastructure/terraform/environments/prod/cost-estimate.sample.json` | Pass | |
| Requirement coverage reviewed | Requirement-to-Command table above | Pass | |

## Final Readiness Decision

- **Ready for next phase:** Yes / No
- **Blocking findings:** _None or list items_
