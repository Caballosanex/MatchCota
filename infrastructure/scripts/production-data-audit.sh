#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://api.matchcota.tech/api/v1}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-20}"

TENANT_FIXTURE_SLUGS=(
  "demo"
  "protectora-barcelona"
  "protectora-girona"
)

FIXTURE_LOGIN_EMAILS=(
  "admin@demo.com"
  "admin@protectorabcn.cat"
)

FIXTURE_LOGIN_PASSWORD="${FIXTURE_LOGIN_PASSWORD:-admin123}"

LEAK_COUNT=0
ERROR_COUNT=0

usage() {
  cat <<'EOF'
Usage:
  bash infrastructure/scripts/production-data-audit.sh [--help]

Read-only production fixture leakage audit.

Checks:
  1) GET /tenants/current with fixture X-Tenant-Slug headers
  2) POST /auth/login with known fixture identities

Any fixture tenant returning HTTP 200 or any fixture login returning a valid access_token is a blocker.

Environment variables:
  API_BASE_URL           API base URL (default: https://api.matchcota.tech/api/v1)
  REQUEST_TIMEOUT        curl timeout seconds (default: 20)
  FIXTURE_LOGIN_PASSWORD Password used for fixture login probes (default: admin123)

Exit code contract:
  0 = PASS (no fixture leakage detected)
  1 = FAIL (fixture leakage detected or probe/runtime error)
EOF
}

stage() {
  echo "[production-data-audit] $1"
}

record_leak() {
  LEAK_COUNT=$((LEAK_COUNT + 1))
  stage "LEAK: $1"
}

record_error() {
  ERROR_COUNT=$((ERROR_COUNT + 1))
  stage "ERROR: $1"
}

probe_fixture_tenant_slug() {
  local slug="$1"
  local url="${API_BASE_URL}/tenants/current"
  local body_file
  local status

  body_file="$(mktemp)"
  status="$(curl -sS -m "$REQUEST_TIMEOUT" -o "$body_file" -w "%{http_code}" -H "X-Tenant-Slug: ${slug}" "$url" || echo "000")"

  if [[ "$status" == "200" ]]; then
    record_leak "fixture tenant reachable via /tenants/current (slug=${slug})"
  elif [[ "$status" == "000" ]]; then
    record_error "tenant probe request failed (slug=${slug})"
  else
    stage "PASS tenant slug blocked/not-found (slug=${slug}, http=${status})"
  fi

  rm -f "$body_file"
}

probe_fixture_login() {
  local email="$1"
  local url="${API_BASE_URL}/auth/login"
  local body_file
  local status

  body_file="$(mktemp)"
  status="$(curl -sS -m "$REQUEST_TIMEOUT" -o "$body_file" -w "%{http_code}" \
    -X POST "$url" \
    -H "X-Tenant-Slug: demo" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "username=${email}" \
    --data-urlencode "password=${FIXTURE_LOGIN_PASSWORD}" \
    --data-urlencode "client_id=demo" || echo "000")"

  if [[ "$status" == "000" ]]; then
    record_error "login probe request failed (email=${email})"
    rm -f "$body_file"
    return
  fi

  if [[ "$status" == "200" ]]; then
    if python3 - "$body_file" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text() or "{}")
access_token = payload.get("access_token")
token_type = payload.get("token_type")
if isinstance(access_token, str) and access_token.strip() and isinstance(token_type, str):
    raise SystemExit(0)
raise SystemExit(1)
PY
    then
      record_leak "fixture login authenticated (email=${email})"
    else
      stage "PASS fixture login did not return token shape (email=${email}, http=200)"
    fi
  else
    stage "PASS fixture login rejected (email=${email}, http=${status})"
  fi

  rm -f "$body_file"
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  stage "start api_base_url=${API_BASE_URL}"

  stage "stage=tenant-fixture-probes start"
  local slug
  for slug in "${TENANT_FIXTURE_SLUGS[@]}"; do
    probe_fixture_tenant_slug "$slug"
  done
  stage "stage=tenant-fixture-probes done"

  stage "stage=login-fixture-probes start"
  local email
  for email in "${FIXTURE_LOGIN_EMAILS[@]}"; do
    probe_fixture_login "$email"
  done
  stage "stage=login-fixture-probes done"

  if (( LEAK_COUNT > 0 || ERROR_COUNT > 0 )); then
    stage "SUMMARY FAIL leaks=${LEAK_COUNT} errors=${ERROR_COUNT}"
    exit 1
  fi

  stage "SUMMARY PASS leaks=0 errors=0"
  exit 0
}

main "$@"
