#!/usr/bin/env bash
# One-time bootstrap for a fresh AWS Academy lab account.
# Idempotent — safe to run multiple times on the same account.
#
# Creates ONLY the Terraform state backend (S3 bucket + DynamoDB lock table).
# All other resources (EIP, SSM secrets, RDS, Lambda, etc.) are managed by
# Terraform itself.
#
# Usage:
#   export AWS_PROFILE=matchcota
#   eval "$(bash infrastructure/scripts/bootstrap.sh)"
#   export TF_VAR_frontend_allowed_ssh_cidrs='["<your-ip>/32"]'
#   bash infrastructure/scripts/terraform-preflight.sh
#
# See operations-runbook.md § "First-time bootstrap" for the full sequence.

set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-matchcota}"
AWS_REGION="${AWS_REGION:-us-east-1}"

export AWS_PROFILE
export AWS_REGION

TF_BACKEND_BUCKET=""
TF_BACKEND_DYNAMODB_TABLE=""
TF_BACKEND_REGION=""

stage() { echo "[bootstrap] $1"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $1" >&2
    exit 1
  fi
}

bootstrap_tf_backend() {
  stage "Terraform state backend (S3 + DynamoDB)"

  local raw_output
  raw_output="$(bash infrastructure/scripts/terraform-bootstrap-backend.sh 2>&1)"
  echo "$raw_output" | grep '^\[bootstrap-backend\]' >&2 || true

  TF_BACKEND_BUCKET="$(echo "$raw_output"     | grep '^TF_BACKEND_BUCKET='         | cut -d= -f2-)"
  TF_BACKEND_DYNAMODB_TABLE="$(echo "$raw_output" | grep '^TF_BACKEND_DYNAMODB_TABLE=' | cut -d= -f2-)"
  TF_BACKEND_REGION="$(echo "$raw_output"     | grep '^TF_BACKEND_REGION='          | cut -d= -f2-)"

  if [[ -z "$TF_BACKEND_BUCKET" || -z "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
    echo "ERROR: terraform-bootstrap-backend.sh did not return expected outputs." >&2
    echo "$raw_output" >&2
    exit 1
  fi

  stage "  bucket=${TF_BACKEND_BUCKET}"
  stage "  table=${TF_BACKEND_DYNAMODB_TABLE}"
  stage "  region=${TF_BACKEND_REGION}"
}

print_summary() {
  cat >&2 <<SUMMARY

════════════════════════════════════════════════════════════════
 BOOTSTRAP COMPLETE
════════════════════════════════════════════════════════════════

Terraform state backend created. All other infrastructure
(EIP, SSM secrets, RDS, Lambda) will be created by Terraform.

Run the following block to export backend variables:
  eval "\$(bash infrastructure/scripts/bootstrap.sh)"

SUMMARY

  cat <<EXPORTS
export TF_BACKEND_BUCKET='${TF_BACKEND_BUCKET}'
export TF_BACKEND_DYNAMODB_TABLE='${TF_BACKEND_DYNAMODB_TABLE}'
export TF_BACKEND_REGION='${TF_BACKEND_REGION:-us-east-1}'
export TF_VAR_terraform_state_bucket='${TF_BACKEND_BUCKET}'
export TF_VAR_terraform_lock_table='${TF_BACKEND_DYNAMODB_TABLE}'
EXPORTS

  cat >&2 <<NEXT

You still need to set:
  export TF_VAR_frontend_allowed_ssh_cidrs='["<your-operator-ip>/32"]'

Next steps (see operations-runbook.md § "First-time bootstrap"):
  1. bash infrastructure/scripts/terraform-preflight.sh
  2. terraform init  (with backend-config values above)
  3. bash infrastructure/scripts/terraform-apply-layer.sh foundation
  4. bash infrastructure/scripts/terraform-apply-layer.sh network
  5. bash infrastructure/scripts/terraform-apply-layer.sh data
  6. bash infrastructure/scripts/terraform-apply-layer.sh runtime
  7. bash infrastructure/scripts/discover-outputs.sh  (if lab session expired)
  8. bash infrastructure/scripts/deploy-backend.sh
  9. bash infrastructure/scripts/deploy-frontend.sh

════════════════════════════════════════════════════════════════
NEXT
}

usage() {
  cat <<'USAGE'
Usage: infrastructure/scripts/bootstrap.sh [--help]

One-time bootstrap for a fresh AWS Academy lab account.
Creates only the Terraform state backend (S3 + DynamoDB).
Idempotent — safe to run multiple times.

All other resources (EIP, secrets, RDS, Lambda) are managed by Terraform.

Environment variables:
  AWS_PROFILE      AWS CLI profile (default: matchcota)
  AWS_REGION       Must be us-east-1 for Academy (default: us-east-1)

Quick start:
  export AWS_PROFILE=matchcota
  eval "$(bash infrastructure/scripts/bootstrap.sh)"
  export TF_VAR_frontend_allowed_ssh_cidrs='["<your-ip>/32"]'
  bash infrastructure/scripts/terraform-preflight.sh
USAGE
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_cmd aws
  require_cmd terraform

  if [[ "$AWS_REGION" != "us-east-1" ]]; then
    echo "ERROR: AWS region must be us-east-1 for Academy production bootstrap." >&2
    exit 1
  fi

  stage "verifying AWS credentials (profile=${AWS_PROFILE})"
  aws sts get-caller-identity >/dev/null

  bootstrap_tf_backend
  print_summary
}

main "$@"
