#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
TF_LOCK_TIMEOUT="5m"
LAYER="${1:-}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"
TF_BACKEND_REGION="${TF_BACKEND_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-matchcota}"

export AWS_PROFILE

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
      cat <<'TARGETS'
terraform_data.academy_guardrails
TARGETS
      ;;
    network)
      cat <<'TARGETS'
aws_route53_zone.primary
aws_vpc.data_plane
aws_internet_gateway.data_plane
aws_subnet.data_plane
aws_route_table.public
aws_route_table.private
aws_route_table_association.public
aws_route_table_association.private
TARGETS
      ;;
    data)
      cat <<'TARGETS'
aws_security_group.lambda_runtime
aws_security_group.rds_postgres
aws_vpc_security_group_ingress_rule.rds_postgres_from_lambda
aws_db_subnet_group.postgres_private
aws_db_instance.postgres
aws_s3_bucket.uploads
aws_s3_bucket_public_access_block.uploads
aws_s3_bucket_ownership_controls.uploads
aws_vpc_endpoint.s3_gateway
TARGETS
      ;;
    runtime)
      cat <<'TARGETS'
aws_s3_object.lambda_runtime_artifact
aws_lambda_function.runtime
aws_apigatewayv2_api.runtime
aws_apigatewayv2_integration.runtime_lambda_proxy
aws_apigatewayv2_route.runtime_root
aws_apigatewayv2_route.runtime_proxy
aws_apigatewayv2_stage.runtime_default
aws_lambda_permission.allow_apigateway_invoke
aws_route53_record.apex_a
aws_route53_record.wildcard_a
aws_route53_record.api_alias_a
aws_acm_certificate.api_custom_domain
aws_route53_record.api_acm_validation
aws_acm_certificate_validation.api_custom_domain
aws_apigatewayv2_domain_name.api_custom_domain
aws_apigatewayv2_api_mapping.api_default
aws_apigatewayv2_api_mapping.api_default_external
terraform_data.edge_tls_bootstrap_contract
TARGETS
      ;;
    *)
      echo "ERROR: Unknown layer '$1'" >&2
      usage
      exit 1
      ;;
  esac
}

init_if_needed() {
  if [[ -d "${TF_ENV_DIR}/.terraform" ]]; then
    echo "[apply-layer] terraform already initialized; skipping backend re-init"
    return
  fi

  if [[ -z "$TF_BACKEND_BUCKET" ]] || [[ -z "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
    echo "ERROR: TF_BACKEND_BUCKET and TF_BACKEND_DYNAMODB_TABLE must be set for first-time prod backend init" >&2
    exit 1
  fi

  echo "[apply-layer] terraform init -reconfigure"
  terraform -chdir="$TF_ENV_DIR" init -reconfigure \
    -backend-config="bucket=${TF_BACKEND_BUCKET}" \
    -backend-config="dynamodb_table=${TF_BACKEND_DYNAMODB_TABLE}" \
    -backend-config="region=${TF_BACKEND_REGION}"
}

main() {
  require_layer
  local plan_file tf_target
  local -a tf_targets plan_args

  tf_targets=()
  while IFS= read -r tf_target; do
    [[ -n "$tf_target" ]] && tf_targets+=("$tf_target")
  done < <(layer_selector "$LAYER")

  plan_file="tfplan-${LAYER}"

  if [[ "${#tf_targets[@]}" -eq 0 ]]; then
    echo "ERROR: No targets resolved for layer '${LAYER}'" >&2
    exit 1
  fi

  echo "[apply-layer] layer=${LAYER} targets=${tf_targets[*]}"
  init_if_needed

  echo "[apply-layer] terraform plan -out=${plan_file}"
  plan_args=(
    -lock=true
    -lock-timeout="$TF_LOCK_TIMEOUT"
    -out="$plan_file"
  )

  for tf_target in "${tf_targets[@]}"; do
    plan_args+=("-target=${tf_target}")
  done

  terraform -chdir="$TF_ENV_DIR" plan "${plan_args[@]}"

  echo "[apply-layer] terraform apply ${plan_file}"
  terraform -chdir=infrastructure/terraform/environments/prod apply \
    -lock=true \
    -lock-timeout="$TF_LOCK_TIMEOUT" \
    "$plan_file"

  echo "[apply-layer] completed layer=${LAYER}"
}

main
