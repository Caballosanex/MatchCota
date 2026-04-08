#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFLIGHT_SCRIPT="${SCRIPT_DIR}/terraform-preflight.sh"
SMOKE_TMP_ENV_DIR=""

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

  stage "PASS all smoke checks"
}

main "$@"
