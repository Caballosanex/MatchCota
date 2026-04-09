#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFLIGHT_SCRIPT="${SCRIPT_DIR}/terraform-preflight.sh"
DNS_DELEGATION_CHECK_SCRIPT="${SCRIPT_DIR}/dns-delegation-check.sh"
TLS_READINESS_CHECK_SCRIPT="${SCRIPT_DIR}/tls-readiness-check.sh"

# Default to the project AWS Academy profile unless caller overrides.
AWS_PROFILE="${AWS_PROFILE:-matchcota}"
export AWS_PROFILE

SMOKE_DOMAIN="${SMOKE_DOMAIN:-matchcota.tech}"
SMOKE_WILDCARD_SAMPLE="${SMOKE_WILDCARD_SAMPLE:-smoke.matchcota.tech}"
SMOKE_API_HOST="${SMOKE_API_HOST:-api.matchcota.tech}"
SMOKE_DNS_TIMEOUT="${SMOKE_DNS_TIMEOUT:-900}"
SMOKE_DNS_INTERVAL="${SMOKE_DNS_INTERVAL:-30}"
SMOKE_TLS_TIMEOUT="${SMOKE_TLS_TIMEOUT:-900}"
SMOKE_TLS_INTERVAL="${SMOKE_TLS_INTERVAL:-30}"
SMOKE_API_BASE_URL="${SMOKE_API_BASE_URL:-https://${SMOKE_API_HOST}/api/v1}"

SMOKE_TMP_ENV_DIR=""
SMOKE_LAMBDA_ARTIFACT_PATH=""

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

ensure_smoke_lambda_artifact() {
  SMOKE_LAMBDA_ARTIFACT_PATH="${SMOKE_TMP_ENV_DIR}/smoke-lambda.zip"

  if [[ -f "backend/dist/lambda.zip" ]]; then
    SMOKE_LAMBDA_ARTIFACT_PATH="$(cd "$(dirname "backend/dist/lambda.zip")" && pwd)/$(basename "backend/dist/lambda.zip")"
    stage "using existing Lambda artifact for smoke plan: ${SMOKE_LAMBDA_ARTIFACT_PATH}"
    return
  fi

  stage "backend/dist/lambda.zip missing; creating deterministic smoke placeholder artifact"
  python3 - "$SMOKE_LAMBDA_ARTIFACT_PATH" <<'PY'
import pathlib
import sys
import zipfile

zip_path = pathlib.Path(sys.argv[1])
zip_path.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(zip_path, "w") as zf:
    zf.writestr("placeholder.txt", "smoke-placeholder")
PY
}

assert_matchcota_runtime_fingerprint() {
  local tmp_headers tmp_body
  tmp_headers="$(mktemp)"
  tmp_body="$(mktemp)"

  stage "stage=runtime_domain_fingerprint start"

  local status_code
  status_code="$(curl -sS -m 20 -D "$tmp_headers" -o "$tmp_body" -w "%{http_code}" "${SMOKE_API_BASE_URL}/health")"

  if [[ "$status_code" == "404" ]]; then
    echo "[smoke] ERROR: runtime health returned HTTP 404 — likely API Gateway stage/base-path mapping mismatch for ${SMOKE_API_BASE_URL}/health" >&2
    echo "[smoke] diagnostics: response headers" >&2
    cat "$tmp_headers" >&2 || true
    echo "[smoke] diagnostics: response body" >&2
    cat "$tmp_body" >&2 || true
    rm -f "$tmp_headers" "$tmp_body"
    exit 1
  fi

  if [[ "$status_code" != "200" ]]; then
    echo "[smoke] ERROR: runtime health check returned HTTP ${status_code}" >&2
    echo "[smoke] diagnostics: response headers" >&2
    cat "$tmp_headers" >&2 || true
    echo "[smoke] diagnostics: response body" >&2
    cat "$tmp_body" >&2 || true
    rm -f "$tmp_headers" "$tmp_body"
    exit 1
  fi

  if ! python3 - "$tmp_body" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
if payload.get("status") != "healthy":
    raise SystemExit(1)
PY
  then
    echo "[smoke] ERROR: runtime health payload missing expected status=healthy" >&2
    cat "$tmp_body" >&2 || true
    rm -f "$tmp_headers" "$tmp_body"
    exit 1
  fi

  local header_body
  header_body="$(cat "$tmp_headers" "$tmp_body")"
  if [[ "$header_body" == *"httpbin.org"* ]] || [[ "$header_body" == *"gunicorn/19.9.0"* ]]; then
    echo "[smoke] ERROR: detected non-MatchCota runtime signature (httpbin/gunicorn)" >&2
    cat "$tmp_headers" >&2 || true
    cat "$tmp_body" >&2 || true
    rm -f "$tmp_headers" "$tmp_body"
    exit 1
  fi

  rm -f "$tmp_headers" "$tmp_body"
  stage "stage=runtime_domain_fingerprint pass"
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
frontend_elastic_ip    = "203.0.113.10"
db_password            = "smoke-placeholder-password"
EOF

  SMOKE_TMP_ENV_DIR="$(mktemp -d)"
  cp "${TF_ENV_DIR}"/*.tf "${SMOKE_TMP_ENV_DIR}/"
  rm -f "${SMOKE_TMP_ENV_DIR}/backend.tf"
  ensure_smoke_lambda_artifact

  terraform -chdir="${SMOKE_TMP_ENV_DIR}" init -backend=false -input=false >/dev/null
  terraform -chdir="${SMOKE_TMP_ENV_DIR}" plan \
    -lock=true \
    -input=false \
    -refresh=false \
    -var-file="${SMOKE_TFVARS}" \
    -var="lambda_artifact_path=${SMOKE_LAMBDA_ARTIFACT_PATH}" \
    -out=tfplan-smoke >/dev/null
  stage "stage=plan pass"

  stage "stage=data_plane_contract start"
  terraform -chdir="${SMOKE_TMP_ENV_DIR}" show -no-color tfplan-smoke >"${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt"

  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_vpc\\.data_plane|aws_subnet\\.data_plane" "missing VPC/subnet resources in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_db_instance\\.postgres" "missing aws_db_instance.postgres in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_s3_bucket_public_access_block\\.uploads" "missing aws_s3_bucket_public_access_block.uploads in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_vpc_endpoint\\.s3_gateway" "missing aws_vpc_endpoint.s3_gateway in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "aws_s3_object\\.lambda_runtime_artifact" "missing aws_s3_object.lambda_runtime_artifact in plan output"
  require_pattern "${SMOKE_TMP_ENV_DIR}/tfplan-smoke.txt" "s3_bucket|s3_key" "missing S3-backed lambda code source fields in plan output"

  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"vpc_id\"" "missing vpc_id output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"private_subnet_ids\"" "missing private_subnet_ids output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"rds_endpoint\"" "missing rds_endpoint output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"uploads_bucket_name\"" "missing uploads_bucket_name output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"s3_gateway_endpoint_id\"" "missing s3_gateway_endpoint_id output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"lambda_artifact_bucket_name\"" "missing lambda_artifact_bucket_name output contract"
  require_pattern "${SMOKE_TMP_ENV_DIR}/outputs.tf" "output \"lambda_artifact_object_key\"" "missing lambda_artifact_object_key output contract"
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

  assert_matchcota_runtime_fingerprint

  stage "stage=complete pass"
}

main "$@"
