#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFLIGHT_SCRIPT="${SCRIPT_DIR}/terraform-preflight.sh"
DNS_DELEGATION_CHECK_SCRIPT="${SCRIPT_DIR}/dns-delegation-check.sh"
TLS_READINESS_CHECK_SCRIPT="${SCRIPT_DIR}/tls-readiness-check.sh"

SMOKE_DOMAIN="${SMOKE_DOMAIN:-matchcota.tech}"
SMOKE_WILDCARD_SAMPLE="${SMOKE_WILDCARD_SAMPLE:-smoke.matchcota.tech}"
SMOKE_API_HOST="${SMOKE_API_HOST:-api.matchcota.tech}"
SMOKE_DNS_TIMEOUT="${SMOKE_DNS_TIMEOUT:-900}"
SMOKE_DNS_INTERVAL="${SMOKE_DNS_INTERVAL:-30}"
SMOKE_TLS_TIMEOUT="${SMOKE_TLS_TIMEOUT:-900}"
SMOKE_TLS_INTERVAL="${SMOKE_TLS_INTERVAL:-30}"

SMOKE_TMP_ENV_DIR=""

require_pattern() {
  local file_path="$1"
  local pattern="$2"
  local message="$3"

  if ! grep -Eq "$pattern" "$file_path"; then
    echo "[smoke] ERROR: ${message}" >&2
    exit 1
  fi
}

cleanup() {
  if [[ -n "${SMOKE_TFVARS:-}" && -f "${SMOKE_TFVARS}" ]]; then
    rm -f "${SMOKE_TFVARS}"
  fi

  if [[ -n "${SMOKE_TMP_ENV_DIR:-}" && -d "${SMOKE_TMP_ENV_DIR}" ]]; then
    rm -rf "${SMOKE_TMP_ENV_DIR}"
  fi
}

stage() {
  echo "[smoke] $1"
}

main() {
  trap cleanup EXIT

  stage "stage=preflight start"
  bash "${PREFLIGHT_SCRIPT}"
  stage "stage=preflight pass"

  stage "stage=fmt_check start (terraform fmt -check)"
  terraform -chdir=infrastructure/terraform/environments/prod fmt -check
  stage "stage=fmt_check pass"

  stage "stage=validate start (terraform validate)"
  terraform -chdir=infrastructure/terraform/environments/prod init -backend=false -reconfigure -input=false >/dev/null
  terraform -chdir=infrastructure/terraform/environments/prod validate
  stage "stage=validate pass"

  stage "stage=plan start (terraform plan)"
  SMOKE_TFVARS="$(mktemp)"
  cat >"${SMOKE_TFVARS}" <<'EOF'
terraform_state_bucket = "smoke-placeholder-state-bucket"
terraform_lock_table   = "smoke-placeholder-lock-table"
EOF

  SMOKE_TMP_ENV_DIR="$(mktemp -d)"
  cp "${TF_ENV_DIR}"/*.tf "${SMOKE_TMP_ENV_DIR}/"
  rm -f "${SMOKE_TMP_ENV_DIR}/backend.tf"

  terraform -chdir="${SMOKE_TMP_ENV_DIR}" init -backend=false -input=false >/dev/null
  terraform -chdir="${SMOKE_TMP_ENV_DIR}" plan \
    -lock=true \
    -input=false \
    -refresh=false \
    -var-file="${SMOKE_TFVARS}" \
    -out=tfplan-smoke >/dev/null
  stage "stage=plan pass"

  stage "stage=data_plane_contract start"
  terraform -chdir="${SMOKE_TMP_ENV_DIR}" show -no-color tfplan-smoke >"${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt"

  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_vpc\\.data_plane|aws_subnet\\.data_plane" "missing VPC/subnet resources in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_db_instance\\.postgres" "missing aws_db_instance.postgres in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_s3_bucket_public_access_block\\.uploads" "missing aws_s3_bucket_public_access_block.uploads in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_vpc_endpoint\\.s3_gateway" "missing aws_vpc_endpoint.s3_gateway in plan output"

  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"vpc_id\"" "missing vpc_id output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"private_subnet_ids\"" "missing private_subnet_ids output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"rds_endpoint\"" "missing rds_endpoint output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"uploads_bucket_name\"" "missing uploads_bucket_name output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"s3_gateway_endpoint_id\"" "missing s3_gateway_endpoint_id output contract"
  stage "stage=data_plane_contract pass"

  stage "stage=dns_delegation start (dns-delegation-check.sh)"
  bash "${DNS_DELEGATION_CHECK_SCRIPT}" \
    --domain "${SMOKE_DOMAIN}" \
    --wildcard-sample "${SMOKE_WILDCARD_SAMPLE}" \
    --api-host "${SMOKE_API_HOST}" \
    --timeout "${SMOKE_DNS_TIMEOUT}" \
    --interval "${SMOKE_DNS_INTERVAL}"
  stage "stage=dns_delegation pass"

  stage "stage=tls_readiness start (tls-readiness-check.sh)"
  bash "${TLS_READINESS_CHECK_SCRIPT}" \
    --apex "${SMOKE_DOMAIN}" \
    --wildcard-sample "${SMOKE_WILDCARD_SAMPLE}" \
    --api "${SMOKE_API_HOST}" \
    --timeout "${SMOKE_TLS_TIMEOUT}" \
    --interval "${SMOKE_TLS_INTERVAL}"
  stage "stage=tls_readiness pass"

  stage "stage=complete pass"
}

main "$@"
