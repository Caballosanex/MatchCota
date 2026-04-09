#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000/api/v1}"
TENANT="${TENANT:-demo}"
HEALTH_REPEATS="${HEALTH_REPEATS:-10}"

stage() {
  echo "[test-api] $1"
}

print_json_if_possible() {
  local body_file="$1"
  if command -v jq >/dev/null 2>&1; then
    jq . "$body_file" 2>/dev/null || cat "$body_file"
  else
    cat "$body_file"
  fi
}

assert_matchcota_fingerprint() {
  local headers_file="$1"
  local body_file="$2"
  local context="$3"
  local combo

  combo="$(cat "$headers_file" "$body_file")"
  if [[ "$combo" == *"httpbin.org"* ]] || [[ "$combo" == *"gunicorn/19.9.0"* ]]; then
    echo "[test-api] ERROR: non-MatchCota signature detected during ${context}" >&2
    echo "[test-api] observed fingerprint diagnostics (headers + body):" >&2
    cat "$headers_file" >&2 || true
    cat "$body_file" >&2 || true
    exit 1
  fi
}

assert_health_payload() {
  local body_file="$1"
  python3 - "$body_file" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
if payload.get("status") != "healthy":
    raise SystemExit("missing status=healthy")
PY
}

run_health_check() {
  local label="$1"
  local headers body status
  headers="$(mktemp)"
  body="$(mktemp)"

  status="$(curl -sS -m 20 -D "$headers" -o "$body" -w "%{http_code}" "$BASE_URL/health")"
  if [[ "$status" != "200" ]]; then
    echo "[test-api] ERROR: ${label} failed with HTTP ${status}" >&2
    cat "$body" >&2 || true
    rm -f "$headers" "$body"
    exit 1
  fi

  assert_matchcota_fingerprint "$headers" "$body" "$label"
  assert_health_payload "$body"

  stage "${label} OK"
  print_json_if_possible "$body"

  rm -f "$headers" "$body"
}

run_tenant_registration_contract_check() {
  local headers body status
  headers="$(mktemp)"
  body="$(mktemp)"

  status="$(curl -sS -m 20 -D "$headers" -o "$body" -w "%{http_code}" \
    -X POST "$BASE_URL/tenants" \
    -H "Content-Type: application/json" \
    --data '{"name":"Runtime Contract Shelter","slug":"runtime-contract-shelter","admin_email":"invalid"}')"

  if [[ "$status" -lt 400 || "$status" -ge 500 ]]; then
    echo "[test-api] ERROR: expected 4xx validation response from POST /tenants, got HTTP ${status}" >&2
    cat "$body" >&2 || true
    rm -f "$headers" "$body"
    exit 1
  fi

  assert_matchcota_fingerprint "$headers" "$body" "tenant-registration-contract"

  if ! python3 - "$body" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
detail = payload.get("detail")
if not isinstance(detail, list):
    raise SystemExit(1)
if not detail:
    raise SystemExit(1)
first = detail[0]
if not isinstance(first, dict):
    raise SystemExit(1)
if "loc" not in first or "msg" not in first:
    raise SystemExit(1)
PY
  then
    echo "[test-api] ERROR: response does not look like FastAPI validation error structure" >&2
    cat "$body" >&2 || true
    rm -f "$headers" "$body"
    exit 1
  fi

  stage "POST /tenants validation contract OK (HTTP ${status})"
  print_json_if_possible "$body"

  rm -f "$headers" "$body"
}

run_repeated_health_checks() {
  local i
  stage "running repeated health checks (count=${HEALTH_REPEATS})"
  for ((i = 1; i <= HEALTH_REPEATS; i++)); do
    run_health_check "health-loop-${i}/${HEALTH_REPEATS}"
  done
}

main() {
  stage "base_url=${BASE_URL} tenant=${TENANT}"
  run_health_check "health-initial"
  run_tenant_registration_contract_check
  run_repeated_health_checks
  stage "all API checks passed"
}

main "$@"
