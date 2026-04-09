#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DNS_CHECK_SCRIPT="${SCRIPT_DIR}/dns-delegation-check.sh"
TLS_CHECK_SCRIPT="${SCRIPT_DIR}/tls-readiness-check.sh"
API_CHECK_SCRIPT="${SCRIPT_DIR}/test_api.sh"

DOMAIN="${DOMAIN:-matchcota.tech}"
WILDCARD_SAMPLE="${WILDCARD_SAMPLE:-smoke.matchcota.tech}"
API_HOST="${API_HOST:-api.matchcota.tech}"
API_BASE_URL="${API_BASE_URL:-https://api.matchcota.tech/api/v1}"
AWS_PROFILE="${AWS_PROFILE:-matchcota}"

DNS_TIMEOUT="${DNS_TIMEOUT:-900}"
DNS_INTERVAL="${DNS_INTERVAL:-30}"
TLS_TIMEOUT="${TLS_TIMEOUT:-900}"
TLS_INTERVAL="${TLS_INTERVAL:-30}"

usage() {
  cat <<'EOF'
Usage:
  bash infrastructure/scripts/post-deploy-readiness.sh [--help]

Deterministic post-deploy orchestration order:
  1) DNS delegation readiness
  2) TLS readiness (apex + wildcard sample + api)
  3) API runtime/readiness checks

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

Exit code contract:
  0 = all stages passed in deterministic order
  non-zero = first failing stage failed (script exits immediately)
EOF
}

stage() {
  echo "[post-deploy-readiness] stage=$1"
}

require_script() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "[post-deploy-readiness] ERROR missing required script: $path" >&2
    exit 1
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
  BASE_URL="$API_BASE_URL" bash "$API_CHECK_SCRIPT"
  stage "test-api pass"

  stage "complete pass"
}

main "$@"
