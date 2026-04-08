#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
TF_LOCK_TIMEOUT="5m"
LAYER="${1:-}"

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
      echo "module.foundation"
      ;;
    network)
      echo "module.network"
      ;;
    data)
      echo "module.data"
      ;;
    runtime)
      echo "module.runtime"
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

  echo "[apply-layer] layer=${LAYER} target=${tf_target}"
  echo "[apply-layer] terraform init -reconfigure"
  terraform -chdir=infrastructure/terraform/environments/prod init -reconfigure

  echo "[apply-layer] terraform plan -out=${plan_file}"
  terraform -chdir=infrastructure/terraform/environments/prod plan \
    -lock=true \
    -lock-timeout="$TF_LOCK_TIMEOUT" \
    -target="$tf_target" \
    -out="$plan_file"

  echo "[apply-layer] terraform apply ${plan_file}"
  terraform -chdir=infrastructure/terraform/environments/prod apply \
    -lock=true \
    -lock-timeout="$TF_LOCK_TIMEOUT" \
    "$plan_file"

  echo "[apply-layer] completed layer=${LAYER}"
}

main
