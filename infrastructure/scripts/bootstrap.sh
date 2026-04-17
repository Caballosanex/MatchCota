#!/usr/bin/env bash
# One-time bootstrap for a fresh AWS Academy lab account.
# Idempotent — safe to run multiple times on the same account.
#
# Covers the three prerequisites that must exist before any Terraform layer
# can run:
#   1. S3 bucket + DynamoDB table for Terraform remote state
#   2. Elastic IP for the frontend edge (stable across instance recreations)
#   3. SSM SecureString parameters for runtime secrets
#
# Usage:
#   export AWS_PROFILE=matchcota
#   bash infrastructure/scripts/bootstrap.sh
#
# See operations-runbook.md § "First-time bootstrap" for the full sequence.

set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-matchcota}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SSM_DB_PARAM="${SSM_DB_PARAM:-DB_PASSWORD}"
SSM_APP_PARAM="${SSM_APP_PARAM:-APP_SECRET_KEY}"
SSM_JWT_PARAM="${SSM_JWT_PARAM:-JWT_SECRET_KEY}"
EIP_TAG_PROJECT="${EIP_TAG_PROJECT:-matchcota}"

export AWS_PROFILE
export AWS_REGION

# ── Globals populated during run ──────────────────────────────────────────────
TF_BACKEND_BUCKET=""
TF_BACKEND_DYNAMODB_TABLE=""
TF_BACKEND_REGION=""
FRONTEND_ELASTIC_IP=""

stage() { echo "[bootstrap] $1"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $1" >&2
    exit 1
  fi
}

gen_secret() {
  python3 -c "import secrets; print(secrets.token_urlsafe(48))"
}

# ── Step 1: Terraform state backend ───────────────────────────────────────────

bootstrap_tf_backend() {
  stage "1/3 — Terraform state backend (S3 + DynamoDB)"

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

# ── Step 2: Elastic IP ────────────────────────────────────────────────────────

allocate_eip() {
  stage "2/3 — Elastic IP"

  # Prefer an existing unassociated EIP already tagged for this project so we
  # do not burn scarce Academy EIP quota on repeated runs.
  local existing
  existing="$(
    aws ec2 describe-addresses \
      --filters "Name=tag:project,Values=${EIP_TAG_PROJECT}" \
      --query 'Addresses[?AssociationId==null] | [0].PublicIp' \
      --output text 2>/dev/null || true
  )"

  if [[ -n "$existing" && "$existing" != "None" && "$existing" != "null" ]]; then
    stage "  reusing existing unassociated EIP: ${existing}"
    FRONTEND_ELASTIC_IP="$existing"
    return
  fi

  stage "  allocating new EIP"
  local alloc_result
  alloc_result="$(
    aws ec2 allocate-address \
      --domain vpc \
      --tag-specifications \
        "ResourceType=elastic-ip,Tags=[{Key=project,Value=${EIP_TAG_PROJECT}},{Key=environment,Value=prod},{Key=managed_by,Value=bootstrap}]"
  )"

  FRONTEND_ELASTIC_IP="$(
    python3 -c "import json,sys; print(json.load(sys.stdin)['PublicIp'])" \
      <<< "$alloc_result"
  )"
  stage "  allocated: ${FRONTEND_ELASTIC_IP}"
}

# ── Step 3: SSM secrets ───────────────────────────────────────────────────────

bootstrap_secret_param() {
  local param_name="$1"

  local existing_name
  existing_name="$(
    aws ssm get-parameter \
      --name "$param_name" \
      --query 'Parameter.Name' \
      --output text 2>/dev/null || true
  )"

  if [[ -n "$existing_name" && "$existing_name" != "None" ]]; then
    stage "  ${param_name}: already exists — skipping (existing value preserved)"
    return
  fi

  local secret_value
  secret_value="$(gen_secret)"

  aws ssm put-parameter \
    --name "$param_name" \
    --value "$secret_value" \
    --type SecureString \
    --tags \
      "Key=project,Value=${EIP_TAG_PROJECT}" \
      "Key=environment,Value=prod" \
      "Key=managed_by,Value=bootstrap" \
    >/dev/null

  stage "  ${param_name}: created"
}

bootstrap_secrets() {
  stage "3/3 — SSM secrets"
  bootstrap_secret_param "$SSM_DB_PARAM"
  bootstrap_secret_param "$SSM_APP_PARAM"
  bootstrap_secret_param "$SSM_JWT_PARAM"
}

# ── Summary ───────────────────────────────────────────────────────────────────

print_summary() {
  # Build the TF_VAR_* export block, reading secret values from SSM now so the
  # operator can copy-paste a single eval block.  Values are printed to stderr
  # to allow `eval "$(bootstrap.sh)"` to capture only the export lines on stdout.
  local db_pass app_key jwt_key
  db_pass="$(aws ssm get-parameter --name "$SSM_DB_PARAM"  --with-decryption --query 'Parameter.Value' --output text)"
  app_key="$(aws ssm get-parameter --name "$SSM_APP_PARAM" --with-decryption --query 'Parameter.Value' --output text)"
  jwt_key="$(aws ssm get-parameter --name "$SSM_JWT_PARAM" --with-decryption --query 'Parameter.Value' --output text)"

  cat >&2 <<SUMMARY

════════════════════════════════════════════════════════════════
 BOOTSTRAP COMPLETE
════════════════════════════════════════════════════════════════

Run the following block to export all variables needed before
the Terraform layer applies.  The block is also emitted to
stdout so you can: eval "\$(bash infrastructure/scripts/bootstrap.sh)"

SUMMARY

  # Emit to stdout for eval capture
  cat <<EXPORTS
export TF_BACKEND_BUCKET='${TF_BACKEND_BUCKET}'
export TF_BACKEND_DYNAMODB_TABLE='${TF_BACKEND_DYNAMODB_TABLE}'
export TF_BACKEND_REGION='${TF_BACKEND_REGION:-us-east-1}'
export TF_VAR_terraform_state_bucket='${TF_BACKEND_BUCKET}'
export TF_VAR_terraform_lock_table='${TF_BACKEND_DYNAMODB_TABLE}'
export TF_VAR_frontend_elastic_ip='${FRONTEND_ELASTIC_IP}'
export TF_VAR_db_password='${db_pass}'
export TF_VAR_ssm_db_password_value='${db_pass}'
export TF_VAR_ssm_app_secret_key_value='${app_key}'
export TF_VAR_ssm_jwt_secret_key_value='${jwt_key}'
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
  7. bash infrastructure/scripts/deploy-backend.sh
  8. bash infrastructure/scripts/deploy-frontend.sh

════════════════════════════════════════════════════════════════
NEXT
}

# ── Main ──────────────────────────────────────────────────────────────────────

usage() {
  cat <<'USAGE'
Usage: infrastructure/scripts/bootstrap.sh [--help]

One-time bootstrap for a fresh AWS Academy lab account.
Idempotent — safe to run multiple times.

Environment variables:
  AWS_PROFILE      AWS CLI profile (default: matchcota)
  AWS_REGION       Must be us-east-1 for Academy (default: us-east-1)
  SSM_DB_PARAM     SSM parameter name for DB password  (default: DB_PASSWORD)
  SSM_APP_PARAM    SSM parameter name for app secret   (default: APP_SECRET_KEY)
  SSM_JWT_PARAM    SSM parameter name for JWT secret   (default: JWT_SECRET_KEY)
  EIP_TAG_PROJECT  Project tag used to find existing EIPs (default: matchcota)

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
  require_cmd python3

  if [[ "$AWS_REGION" != "us-east-1" ]]; then
    echo "ERROR: AWS region must be us-east-1 for Academy production bootstrap." >&2
    exit 1
  fi

  stage "verifying AWS credentials (profile=${AWS_PROFILE})"
  aws sts get-caller-identity >/dev/null

  bootstrap_tf_backend
  allocate_eip
  bootstrap_secrets
  print_summary
}

main "$@"
