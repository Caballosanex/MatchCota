#!/usr/bin/env bash

set -euo pipefail

SCRIPT_PATH="infrastructure/scripts/dns-delegation-check.sh"
DEFAULT_TIMEOUT=900
DEFAULT_INTERVAL=30
TF_ENV_DIR="infrastructure/terraform/environments/prod"

DOMAIN=""
WILDCARD_SAMPLE=""
API_HOST=""
EXPECTED_NS_RAW=""
TIMEOUT="$DEFAULT_TIMEOUT"
INTERVAL="$DEFAULT_INTERVAL"

usage() {
  cat <<'EOF'
Usage:
  bash infrastructure/scripts/dns-delegation-check.sh \
    --domain matchcota.tech \
    --wildcard-sample demo.matchcota.tech \
    --api-host api.matchcota.tech \
    [--expected-ns "ns-1.awsdns.com,ns-2.awsdns.net,ns-3.awsdns.org,ns-4.awsdns.co.uk"] \
    [--timeout 900] \
    [--interval 30]

Checks:
  1) Registrar delegation NS matches Route53 hosted zone NS
  2) Apex A record resolves
  3) Wildcard sample A record resolves
  4) API host A record resolves

Exit codes:
  0 = PASS
  1 = validation/command/runtime error
  2 = timed out waiting for delegation/DNS propagation
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

  # Basic FQDN checks (labels 1-63 chars, alnum/hyphen, no leading/trailing hyphen)
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
      --domain)
        DOMAIN="${2:-}"
        shift 2
        ;;
      --wildcard-sample)
        WILDCARD_SAMPLE="${2:-}"
        shift 2
        ;;
      --api-host)
        API_HOST="${2:-}"
        shift 2
        ;;
      --expected-ns)
        EXPECTED_NS_RAW="${2:-}"
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

  [[ -n "$DOMAIN" ]] || fail "--domain is required"
  [[ -n "$WILDCARD_SAMPLE" ]] || fail "--wildcard-sample is required"
  [[ -n "$API_HOST" ]] || fail "--api-host is required"
  [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || fail "--timeout must be a positive integer"
  [[ "$INTERVAL" =~ ^[0-9]+$ ]] || fail "--interval must be a positive integer"
  (( TIMEOUT > 0 )) || fail "--timeout must be > 0"
  (( INTERVAL > 0 )) || fail "--interval must be > 0"

  DOMAIN="$(normalize_host "$DOMAIN")"
  WILDCARD_SAMPLE="$(normalize_host "$WILDCARD_SAMPLE")"
  API_HOST="$(normalize_host "$API_HOST")"

  is_valid_hostname "$DOMAIN" || fail "invalid --domain hostname: $DOMAIN"
  is_valid_hostname "$WILDCARD_SAMPLE" || fail "invalid --wildcard-sample hostname: $WILDCARD_SAMPLE"
  is_valid_hostname "$API_HOST" || fail "invalid --api-host hostname: $API_HOST"

  [[ "$WILDCARD_SAMPLE" == *".$DOMAIN" ]] || fail "--wildcard-sample must be a subdomain of --domain"
  [[ "$API_HOST" == *".$DOMAIN" ]] || fail "--api-host must be a subdomain of --domain"
}

load_expected_name_servers() {
  if [[ -n "$EXPECTED_NS_RAW" ]]; then
    python3 -c 'import sys
vals=[]
for part in sys.argv[1].split(","):
    v=part.strip().rstrip(".").lower()
    if v:
        vals.append(v)
print("\\n".join(sorted(set(vals))))' "$EXPECTED_NS_RAW"
    return 0
  fi

  local tf_json
  tf_json="$(terraform -chdir="$TF_ENV_DIR" output -json route53_hosted_zone_name_servers 2>/dev/null || true)"
  [[ -n "$tf_json" ]] || return 1

  python3 -c 'import json,sys
raw=sys.stdin.read().strip()
if not raw:
    raise SystemExit(1)
data=json.loads(raw)
print("\\n".join(sorted(x.rstrip(".").lower() for x in data)))' <<<"$tf_json"
}

query_parent_name_servers() {
  dig +short NS "$DOMAIN" \
    | python3 -c 'import sys; vals=[line.strip().rstrip(".").lower() for line in sys.stdin if line.strip()]; print("\n".join(sorted(set(vals))))'
}

query_ipv4_answers() {
  local host="$1"
  dig +short A "$host" \
    | python3 -c 'import ipaddress,sys; vals=[]
for line in sys.stdin:
    raw=line.strip()
    if not raw:
        continue
    try:
        ipaddress.IPv4Address(raw)
    except Exception:
        continue
    vals.append(raw)
print("\n".join(sorted(set(vals))))'
}

print_resume_instructions() {
  log "RESUME: Run after registrar NS update has propagated:"
  log "bash $SCRIPT_PATH --domain $DOMAIN --wildcard-sample $WILDCARD_SAMPLE --api-host $API_HOST --timeout $TIMEOUT --interval $INTERVAL"
}

main() {
  require_cmd dig
  require_cmd terraform
  require_cmd python3

  parse_args "$@"

  local deadline now elapsed
  now="$(date +%s)"
  deadline=$((now + TIMEOUT))

  log "Starting DNS delegation/readiness check for domain=$DOMAIN wildcard_sample=$WILDCARD_SAMPLE api_host=$API_HOST timeout=${TIMEOUT}s interval=${INTERVAL}s"

  while true; do
    now="$(date +%s)"
    if (( now > deadline )); then
      log "STATUS: blocked-waiting-for-delegation"
      log "FAIL: propagation timeout reached after ${TIMEOUT}s"
      print_resume_instructions
      exit 2
    fi

    elapsed=$((now - (deadline - TIMEOUT)))
    log "Attempt elapsed=${elapsed}s"

    local expected_ns parent_ns apex_ips wildcard_ips api_ips
    expected_ns="$(load_expected_name_servers || true)"
    parent_ns="$(query_parent_name_servers || true)"
    apex_ips="$(query_ipv4_answers "$DOMAIN" || true)"
    wildcard_ips="$(query_ipv4_answers "$WILDCARD_SAMPLE" || true)"
    api_ips="$(query_ipv4_answers "$API_HOST" || true)"

    local delegation_ok apex_ok wildcard_ok api_ok
    delegation_ok=0
    apex_ok=0
    wildcard_ok=0
    api_ok=0

    if [[ -z "$expected_ns" ]]; then
      log "FAIL delegation NS expected set unavailable (Terraform output not readable yet)"
      log "HINT: run terraform apply for DNS layer or pass --expected-ns explicitly"
    elif [[ -n "$parent_ns" && "$parent_ns" == "$expected_ns" ]]; then
      delegation_ok=1
      log "PASS delegation NS match"
    else
      log "FAIL delegation NS mismatch"
      log "Expected Route53 NS:\n${expected_ns:-<none>}"
      log "Observed parent NS:\n${parent_ns:-<none>}"
    fi

    if [[ -n "$apex_ips" ]]; then
      apex_ok=1
      log "PASS apex A records for $DOMAIN => ${apex_ips//$'\n'/, }"
    else
      log "FAIL apex A records for $DOMAIN => <none>"
    fi

    if [[ -n "$wildcard_ips" ]]; then
      wildcard_ok=1
      log "PASS wildcard sample A records for $WILDCARD_SAMPLE => ${wildcard_ips//$'\n'/, }"
    else
      log "FAIL wildcard sample A records for $WILDCARD_SAMPLE => <none>"
    fi

    if [[ -n "$api_ips" ]]; then
      api_ok=1
      log "PASS api host A records for $API_HOST => ${api_ips//$'\n'/, }"
    else
      log "FAIL api host A records for $API_HOST => <none>"
    fi

    if (( delegation_ok == 1 && apex_ok == 1 && wildcard_ok == 1 && api_ok == 1 )); then
      log "OVERALL: PASS all DNS/delegation checks"
      exit 0
    fi

    log "STATUS: blocked-waiting-for-delegation"
    sleep "$INTERVAL"
  done
}

main "$@"
