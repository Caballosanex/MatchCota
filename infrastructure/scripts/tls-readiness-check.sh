#!/usr/bin/env bash

set -euo pipefail

SCRIPT_PATH="infrastructure/scripts/tls-readiness-check.sh"
DEFAULT_TIMEOUT=900
DEFAULT_INTERVAL=30

APEX=""
WILDCARD_SAMPLE=""
API_HOST=""
TIMEOUT="$DEFAULT_TIMEOUT"
INTERVAL="$DEFAULT_INTERVAL"

usage() {
  cat <<'EOF'
Usage:
  bash infrastructure/scripts/tls-readiness-check.sh \
    --apex matchcota.tech \
    --wildcard-sample demo.matchcota.tech \
    --api api.matchcota.tech \
    [--timeout 900] \
    [--interval 30]

Checks exactly three domain classes:
  - apex
  - wildcard sample
  - api

Exit codes:
  0 = PASS
  1 = validation/command/runtime error
  2 = timed out waiting for TLS readiness
EOF
}

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*"
}

fail() {
  log "FAIL: $*"
  exit 1
}

normalize_host() {
  local value="$1"
  printf '%s' "${value%.}" | tr '[:upper:]' '[:lower:]'
}

is_valid_hostname() {
  local host
  host="$(normalize_host "$1")"
  [[ ${#host} -le 253 ]] || return 1
  [[ "$host" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?))+$ ]]
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "required command not found: $cmd"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --apex)
        APEX="${2:-}"
        shift 2
        ;;
      --wildcard-sample)
        WILDCARD_SAMPLE="${2:-}"
        shift 2
        ;;
      --api)
        API_HOST="${2:-}"
        shift 2
        ;;
      --timeout)
        TIMEOUT="${2:-}"
        shift 2
        ;;
      --interval)
        INTERVAL="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage
        fail "unknown argument: $1"
        ;;
    esac
  done

  [[ -n "$APEX" ]] || fail "--apex is required"
  [[ -n "$WILDCARD_SAMPLE" ]] || fail "--wildcard-sample is required"
  [[ -n "$API_HOST" ]] || fail "--api is required"
  [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || fail "--timeout must be a positive integer"
  [[ "$INTERVAL" =~ ^[0-9]+$ ]] || fail "--interval must be a positive integer"
  (( TIMEOUT > 0 )) || fail "--timeout must be > 0"
  (( INTERVAL > 0 )) || fail "--interval must be > 0"

  APEX="$(normalize_host "$APEX")"
  WILDCARD_SAMPLE="$(normalize_host "$WILDCARD_SAMPLE")"
  API_HOST="$(normalize_host "$API_HOST")"

  is_valid_hostname "$APEX" || fail "invalid --apex hostname: $APEX"
  is_valid_hostname "$WILDCARD_SAMPLE" || fail "invalid --wildcard-sample hostname: $WILDCARD_SAMPLE"
  is_valid_hostname "$API_HOST" || fail "invalid --api hostname: $API_HOST"

  [[ "$WILDCARD_SAMPLE" == *".$APEX" ]] || fail "--wildcard-sample must be a subdomain of --apex"
  [[ "$API_HOST" == *".$APEX" ]] || fail "--api must be a subdomain of --apex"
}

verify_tls_domain() {
  local host="$1"
  local output
  if ! output="$(openssl s_client \
      -connect "${host}:443" \
      -servername "$host" \
      -verify_hostname "$host" \
      -verify_return_error \
      -brief < /dev/null 2>&1)"; then
    return 1
  fi

  if [[ "$output" != *"Verification: OK"* ]] && [[ "$output" != *"Verify return code: 0 (ok)"* ]]; then
    return 1
  fi

  return 0
}

print_summary() {
  local apex_status="$1"
  local wildcard_status="$2"
  local api_status="$3"

  log "SUMMARY apex=${apex_status} wildcard=${wildcard_status} api=${api_status}"
}

print_resume_instructions() {
  log "RESUME: rerun once certificates are issued and attached:"
  log "bash $SCRIPT_PATH --apex $APEX --wildcard-sample $WILDCARD_SAMPLE --api $API_HOST --timeout $TIMEOUT --interval $INTERVAL"
}

main() {
  require_cmd openssl

  parse_args "$@"

  local start now deadline elapsed
  start="$(date +%s)"
  now="$start"
  deadline=$((start + TIMEOUT))

  log "Starting TLS readiness check apex=$APEX wildcard_sample=$WILDCARD_SAMPLE api=$API_HOST timeout=${TIMEOUT}s interval=${INTERVAL}s"

  while true; do
    now="$(date +%s)"
    if (( now > deadline )); then
      log "OVERALL: FAIL (timeout ${TIMEOUT}s reached)"
      print_resume_instructions
      exit 2
    fi

    elapsed=$((now - start))
    log "Attempt elapsed=${elapsed}s"

    local apex_status wildcard_status api_status
    apex_status="FAIL"
    wildcard_status="FAIL"
    api_status="FAIL"

    if verify_tls_domain "$APEX"; then
      apex_status="PASS"
      log "PASS apex TLS hostname/certificate check ($APEX)"
    else
      log "FAIL apex TLS hostname/certificate check ($APEX)"
    fi

    if verify_tls_domain "$WILDCARD_SAMPLE"; then
      wildcard_status="PASS"
      log "PASS wildcard TLS hostname/certificate check ($WILDCARD_SAMPLE)"
    else
      log "FAIL wildcard TLS hostname/certificate check ($WILDCARD_SAMPLE)"
    fi

    if verify_tls_domain "$API_HOST"; then
      api_status="PASS"
      log "PASS api TLS hostname/certificate check ($API_HOST)"
    else
      log "FAIL api TLS hostname/certificate check ($API_HOST)"
    fi

    print_summary "$apex_status" "$wildcard_status" "$api_status"

    if [[ "$apex_status" == "PASS" && "$wildcard_status" == "PASS" && "$api_status" == "PASS" ]]; then
      log "OVERALL: PASS all domain classes passed TLS readiness"
      exit 0
    fi

    sleep "$INTERVAL"
  done
}

main "$@"
