#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
TF_LOCK_TIMEOUT="5m"
LAYER="${1:-}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"
TF_BACKEND_REGION="${TF_BACKEND_REGION:-us-east-1}"

usage() {
  cat <<'USAGE'
Usage: infrastructure/scripts/terraform-apply-layer.sh <layer>

Layers:
  foundation
  network
  data
  runtime

Examples:
  infrastructure/scripts/terraform-apply-layer.sh foundation
  infrastructure/scripts/terraform-apply-layer.sh network
USAGE
}

require_layer() {
  if [[ -z "$LAYER" ]]; then
    usage
    exit 1
  fi
}

layer_selector() {
  case "$1" in
    foundation)
      echo "terraform_data.academy_guardrails"
      ;;
    network)
      echo "aws_route53_zone.primary"
      ;;
    data)
      echo "aws_route53_record.apex_a,aws_route53_record.wildcard_a,aws_route53_record.api_alias_a"
      ;;
    runtime)
      echo "aws_acm_certificate.api_custom_domain"
      ;;
    *)
      echo "ERROR: Unknown layer '$1'" >&2
      usage
      exit 1
      ;;
  esac
}

main() {
  require_layer
  local tf_target plan_file
  tf_target="$(layer_selector "$LAYER")"
  plan_file="tfplan-${LAYER}"

  if [[ -z "$TF_BACKEND_BUCKET" ]] || [[ -z "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
    echo "ERROR: TF_BACKEND_BUCKET and TF_BACKEND_DYNAMODB_TABLE must be set for prod backend init" >&2
    exit 1
  fi

  echo "[apply-layer] layer=${LAYER} target=${tf_target}"
  echo "[apply-layer] terraform init -reconfigure"
  terraform -chdir="$TF_ENV_DIR" init -reconfigure \
    -backend-config="bucket=${TF_BACKEND_BUCKET}" \
    -backend-config="dynamodb_table=${TF_BACKEND_DYNAMODB_TABLE}" \
    -backend-config="region=${TF_BACKEND_REGION}"

  echo "[apply-layer] terraform plan -out=${plan_file}"
  if [[ "$LAYER" == "data" ]]; then
    terraform -chdir="$TF_ENV_DIR" plan \
      -lock=true \
      -lock-timeout="$TF_LOCK_TIMEOUT" \
      -target="aws_route53_record.apex_a" \
      -target="aws_route53_record.wildcard_a" \
      -target="aws_route53_record.api_alias_a" \
      -out="$plan_file"
  else
    terraform -chdir="$TF_ENV_DIR" plan \
      -lock=true \
      -lock-timeout="$TF_LOCK_TIMEOUT" \
      -target="$tf_target" \
      -out="$plan_file"
  fi

  echo "[apply-layer] terraform apply ${plan_file}"
  terraform -chdir=infrastructure/terraform/environments/prod apply \
    -lock=true \
    -lock-timeout="$TF_LOCK_TIMEOUT" \
    "$plan_file"

  echo "[apply-layer] completed layer=${LAYER}"
}

main
