#!/usr/bin/env bash

set -euo pipefail

EXPECTED_REGION="us-east-1"
MIN_TF_MINOR=14
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"

# Default to the project AWS Academy profile unless caller overrides.
AWS_PROFILE="${AWS_PROFILE:-matchcota}"
export AWS_PROFILE

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

check_backend_bucket() {
  if [[ -z "$TF_BACKEND_BUCKET" ]]; then
    return
  fi

  if ! aws s3api head-bucket --bucket "$TF_BACKEND_BUCKET" >/dev/null 2>&1; then
    echo "ERROR: Backend bucket is not accessible: ${TF_BACKEND_BUCKET}" >&2
    exit 1
  fi
}

check_backend_lock_table() {
  if [[ -z "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
    return
  fi

  if ! aws dynamodb describe-table --table-name "$TF_BACKEND_DYNAMODB_TABLE" >/dev/null 2>&1; then
    echo "ERROR: Backend lock table is not accessible: ${TF_BACKEND_DYNAMODB_TABLE}" >&2
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

  if [[ -n "$TF_BACKEND_BUCKET" || -n "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
    if [[ -z "$TF_BACKEND_BUCKET" || -z "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
      echo "ERROR: Backend prerequisites are incomplete. Set both TF_BACKEND_BUCKET and TF_BACKEND_DYNAMODB_TABLE." >&2
      exit 1
    fi

    echo "[preflight] verifying backend bucket access"
    check_backend_bucket

    echo "[preflight] verifying backend lock table access"
    check_backend_lock_table
  fi

  echo "[preflight] PASS"
}

main "$@"
