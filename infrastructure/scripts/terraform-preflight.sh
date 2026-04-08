#!/usr/bin/env bash

set -euo pipefail

EXPECTED_REGION="us-east-1"
MIN_TF_MINOR=14

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    exit 1
  fi
}

check_terraform_version() {
  local raw version major minor
  raw="$(terraform version -json)"
  version="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["terraform_version"])' <<<"$raw")"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"

  if [[ "$major" -ne 1 ]] || [[ "$minor" -lt "$MIN_TF_MINOR" ]]; then
    echo "ERROR: Terraform version must satisfy ~> 1.14 (found $version)" >&2
    exit 1
  fi
}

check_region() {
  local active_region
  active_region="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

  if [[ -z "$active_region" ]]; then
    active_region="$(aws configure get region 2>/dev/null || true)"
  fi

  if [[ "$active_region" != "$EXPECTED_REGION" ]]; then
    echo "ERROR: AWS region must be $EXPECTED_REGION (found '${active_region:-unset}')" >&2
    exit 1
  fi
}

main() {
  require_cmd aws
  require_cmd terraform
  require_cmd python3

  echo "[preflight] verifying Terraform version"
  check_terraform_version

  echo "[preflight] verifying AWS region is $EXPECTED_REGION"
  check_region

  echo "[preflight] verifying AWS credentials with STS"
  aws sts get-caller-identity >/dev/null

  echo "[preflight] PASS"
}

main "$@"
