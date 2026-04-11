#!/usr/bin/env bash

set -euo pipefail

BOOTSTRAP_DIR="infrastructure/terraform/bootstrap/state-backend"
AWS_PROFILE="${AWS_PROFILE:-matchcota}"
AWS_REGION="${AWS_REGION:-us-east-1}"

export AWS_PROFILE
export AWS_REGION

stage() {
  echo "[bootstrap-backend] $1"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    exit 1
  fi
}

main() {
  require_cmd terraform
  require_cmd aws

  if [[ ! -d "$BOOTSTRAP_DIR" ]]; then
    echo "ERROR: Bootstrap stack not found at ${BOOTSTRAP_DIR}" >&2
    exit 1
  fi

  if [[ "$AWS_REGION" != "us-east-1" ]]; then
    echo "ERROR: AWS region must be us-east-1 for Academy production bootstrap" >&2
    exit 1
  fi

  stage "verifying AWS credentials"
  aws sts get-caller-identity >/dev/null

  stage "terraform init"
  terraform -chdir="$BOOTSTRAP_DIR" init -input=false -reconfigure >/dev/null

  stage "terraform apply (state backend resources)"
  terraform -chdir="$BOOTSTRAP_DIR" apply -input=false -auto-approve >/dev/null

  local bucket lock_table backend_region
  bucket="$(terraform -chdir="$BOOTSTRAP_DIR" output -raw terraform_state_bucket_name)"
  lock_table="$(terraform -chdir="$BOOTSTRAP_DIR" output -raw terraform_lock_table_name)"
  backend_region="$(terraform -chdir="$BOOTSTRAP_DIR" output -raw terraform_backend_region)"

  echo "TF_BACKEND_BUCKET=${bucket}"
  echo "TF_BACKEND_DYNAMODB_TABLE=${lock_table}"
  echo "TF_BACKEND_REGION=${backend_region}"
}

main "$@"
