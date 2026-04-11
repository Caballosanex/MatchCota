#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DNS_CHECK_SCRIPT="${SCRIPT_DIR}/dns-delegation-check.sh"
TLS_CHECK_SCRIPT="${SCRIPT_DIR}/tls-readiness-check.sh"
API_CHECK_SCRIPT="${SCRIPT_DIR}/test_api.sh"
FRONTEND_DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-frontend.sh"

DOMAIN="${DOMAIN:-matchcota.tech}"
WILDCARD_SAMPLE="${WILDCARD_SAMPLE:-smoke.matchcota.tech}"
API_HOST="${API_HOST:-api.matchcota.tech}"
API_BASE_URL="${API_BASE_URL:-https://api.matchcota.tech/api/v1}"
AWS_PROFILE="${AWS_PROFILE:-matchcota}"

DNS_TIMEOUT="${DNS_TIMEOUT:-900}"
DNS_INTERVAL="${DNS_INTERVAL:-30}"
TLS_TIMEOUT="${TLS_TIMEOUT:-900}"
TLS_INTERVAL="${TLS_INTERVAL:-30}"
KNOWN_TENANT_SLUG="${KNOWN_TENANT_SLUG:-}"
KNOWN_TENANT_HOST="${KNOWN_TENANT_HOST:-}"

usage() {
  cat <<'EOF'
Usage:
  bash infrastructure/scripts/post-deploy-readiness.sh [--help]

Deterministic post-deploy orchestration order:
  1) DNS delegation readiness
  2) TLS readiness (apex + wildcard sample + api)
  3) API runtime/readiness checks
  4) Frontend host-routing contract readiness checks

Environment variables (all optional defaults shown):
  AWS_PROFILE      AWS profile for commands that use AWS credentials (default: matchcota)
  DOMAIN           Apex production domain (default: matchcota.tech)
  WILDCARD_SAMPLE  Sample wildcard host to verify (default: smoke.matchcota.tech)
  API_HOST         API host for DNS/TLS checks (default: api.matchcota.tech)
  API_BASE_URL     API base URL for test_api.sh BASE_URL (default: https://api.matchcota.tech/api/v1)
  DNS_TIMEOUT      Seconds before dns-delegation-check timeout (default: 900)
  DNS_INTERVAL     Seconds between dns-delegation-check retries (default: 30)
  TLS_TIMEOUT      Seconds before tls-readiness-check timeout (default: 900)
  TLS_INTERVAL     Seconds between tls-readiness-check retries (default: 30)
  KNOWN_TENANT_SLUG Known production tenant slug for host-routing checks (required unless KNOWN_TENANT_HOST is set)
  KNOWN_TENANT_HOST Known production tenant host override for host-routing checks (optional)

Exit code contract:
  0 = all stages passed in deterministic order
  non-zero = first failing stage failed (script exits immediately)
EOF
}

stage() {
  echo "[post-deploy-readiness] stage=$1"
}

fail_stage() {
  local stage_name="$1"
  local reason="$2"
  local rerun_hint="$3"

  echo "[post-deploy-readiness] stage=${stage_name} fail reason=${reason}" >&2
  if [[ -n "$rerun_hint" ]]; then
    echo "[post-deploy-readiness] diagnostics: ${rerun_hint}" >&2
  fi
  exit 1
}

require_script() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "[post-deploy-readiness] ERROR missing required script: $path" >&2
    exit 1
  fi
}

run_frontend_route_readiness() {
  local tenant_slug="$KNOWN_TENANT_SLUG"
  local tenant_host="$KNOWN_TENANT_HOST"

  if [[ -z "$tenant_slug" && -z "$tenant_host" ]]; then
    fail_stage "frontend-route-readiness" "missing-known-tenant" \
      "set KNOWN_TENANT_SLUG=<known-production-tenant> (or KNOWN_TENANT_HOST=<tenant.matchcota.tech>) and rerun post-deploy-readiness.sh"
  fi

  echo "[post-deploy-readiness] frontend contracts: apex redirects, tenant root shell, registration landing target, tenant preboot endpoint"

  if ! KNOWN_TENANT_SLUG="$tenant_slug" KNOWN_TENANT_HOST="$tenant_host" \
    VITE_BASE_DOMAIN="$DOMAIN" VITE_ENVIRONMENT="production" \
    bash "$FRONTEND_DEPLOY_SCRIPT" --verify-route-contracts-only; then
    fail_stage "frontend-route-readiness" "routing-contract-failed" \
      "rerun with KNOWN_TENANT_SLUG=<slug> (or KNOWN_TENANT_HOST=<host>) and inspect deploy-frontend --verify-route-contracts-only output above"
  fi
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  export AWS_PROFILE

  require_script "$DNS_CHECK_SCRIPT"
  require_script "$TLS_CHECK_SCRIPT"
  require_script "$API_CHECK_SCRIPT"
  require_script "$FRONTEND_DEPLOY_SCRIPT"

  stage "dns-delegation-check start"
  bash "$DNS_CHECK_SCRIPT" \
    --domain "$DOMAIN" \
    --wildcard-sample "$WILDCARD_SAMPLE" \
    --api-host "$API_HOST" \
    --timeout "$DNS_TIMEOUT" \
    --interval "$DNS_INTERVAL"
  stage "dns-delegation-check pass"

  stage "tls-readiness-check start"
  bash "$TLS_CHECK_SCRIPT" \
    --apex "$DOMAIN" \
    --wildcard-sample "$WILDCARD_SAMPLE" \
    --api "$API_HOST" \
    --timeout "$TLS_TIMEOUT" \
    --interval "$TLS_INTERVAL"
  stage "tls-readiness-check pass"

  stage "test-api start"
  if ! BASE_URL="$API_BASE_URL" bash "$API_CHECK_SCRIPT"; then
    fail_stage "test-api" "api-contract-failed" \
      "frontend-route-readiness and complete pass are blocked until API + frontend contracts pass in the same run; verify API_BASE_URL=${API_BASE_URL} and rerun"
  fi
  stage "test-api pass"

  stage "frontend-route-readiness start"
  run_frontend_route_readiness
  stage "frontend-route-readiness pass"

  stage "complete pass"
}

main "$@"
