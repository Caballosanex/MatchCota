#!/usr/bin/env bash
# Discover Terraform output values from live AWS resources.
# Use this when Terraform state is inaccessible (e.g. AWS Academy labs).
#
# Writes TF_OUT_* variables to .env.deploy (or DEPLOY_ENV_FILE) so that
# deploy-backend.sh and deploy-frontend.sh can proceed without terraform output.
#
# Usage:
#   export AWS_PROFILE=matchcota
#   bash infrastructure/scripts/discover-outputs.sh
#   # Then:
#   bash infrastructure/scripts/deploy-backend.sh
#
# Idempotent — safe to run multiple times; overwrites .env.deploy each time.

set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-matchcota}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-.env.deploy}"
PROJECT_TAG="${PROJECT_TAG:-matchcota}"

export AWS_PROFILE
export AWS_REGION

stage() { echo "[discover] $1"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $1" >&2
    exit 1
  fi
}

normalize_aws_text() {
  local value="$1"
  if [[ "$value" == "None" || "$value" == "null" || "$value" == "" ]]; then
    echo ""
  else
    echo "$value"
  fi
}

# ── Discovery functions ───────────────────────────────────────────────────────

discover_lambda() {
  stage "Lambda function"
  local name
  name="$(aws lambda list-functions \
    --query "Functions[?starts_with(FunctionName, 'matchcota-prod')].FunctionName | [0]" \
    --output text 2>/dev/null || true)"
  name="$(normalize_aws_text "$name")"

  if [[ -z "$name" ]]; then
    name="matchcota-prod-api"
    stage "  not found via API, using default: ${name}"
  else
    stage "  found: ${name}"
  fi
  TF_OUT_lambda_function_name="$name"
}

discover_api_gateway() {
  stage "API Gateway"
  local api_id invoke_url
  api_id="$(aws apigatewayv2 get-apis \
    --query "Items[?Name=='matchcota-prod-http-api'].ApiId | [0]" \
    --output text 2>/dev/null || true)"
  api_id="$(normalize_aws_text "$api_id")"

  if [[ -n "$api_id" ]]; then
    invoke_url="https://${api_id}.execute-api.${AWS_REGION}.amazonaws.com/\$default"
    stage "  found api_id=${api_id}"
  else
    invoke_url=""
    stage "  WARNING: API Gateway not found"
  fi
  TF_OUT_api_gateway_invoke_url="$invoke_url"
}

discover_s3_buckets() {
  stage "S3 buckets"

  local uploads_bucket
  uploads_bucket="$(aws s3api list-buckets \
    --query "Buckets[?starts_with(Name, 'matchcota-prod-uploads')].Name | [0]" \
    --output text 2>/dev/null || true)"
  uploads_bucket="$(normalize_aws_text "$uploads_bucket")"

  if [[ -z "$uploads_bucket" ]]; then
    uploads_bucket="matchcota-prod-uploads"
    stage "  uploads bucket not found via API, using default: ${uploads_bucket}"
  else
    stage "  uploads: ${uploads_bucket}"
  fi
  TF_OUT_uploads_bucket_name="$uploads_bucket"
  TF_OUT_lambda_artifact_bucket_name="$uploads_bucket"
  TF_OUT_lambda_artifact_object_key="runtime/lambda.zip"
}

discover_rds() {
  stage "RDS PostgreSQL"
  local endpoint port
  endpoint="$(aws rds describe-db-instances \
    --db-instance-identifier matchcota-prod-postgres \
    --query "DBInstances[0].Endpoint.Address" \
    --output text 2>/dev/null || true)"
  endpoint="$(normalize_aws_text "$endpoint")"

  port="$(aws rds describe-db-instances \
    --db-instance-identifier matchcota-prod-postgres \
    --query "DBInstances[0].Endpoint.Port" \
    --output text 2>/dev/null || true)"
  port="$(normalize_aws_text "$port")"

  if [[ -z "$endpoint" ]]; then
    stage "  WARNING: RDS instance not found"
  else
    stage "  endpoint: ${endpoint}:${port}"
  fi

  TF_OUT_rds_endpoint="${endpoint}"
  TF_OUT_rds_port="${port:-5432}"
  TF_OUT_db_name="matchcota"
  TF_OUT_db_username="matchcota_admin"
}

discover_ssm_params() {
  stage "SSM parameters"
  TF_OUT_ssm_db_password_parameter_name="DB_PASSWORD"
  TF_OUT_ssm_app_secret_key_parameter_name="APP_SECRET_KEY"
  TF_OUT_ssm_jwt_secret_key_parameter_name="JWT_SECRET_KEY"

  local param ok=0
  for param in "$TF_OUT_ssm_db_password_parameter_name" "$TF_OUT_ssm_app_secret_key_parameter_name" "$TF_OUT_ssm_jwt_secret_key_parameter_name"; do
    if aws ssm get-parameter --name "$param" >/dev/null 2>&1; then
      stage "  ${param}: exists"
      ok=$((ok + 1))
    else
      stage "  WARNING: ${param}: not found"
    fi
  done

  if [[ $ok -lt 3 ]]; then
    stage "  Run bootstrap.sh first to create missing SSM parameters"
  fi
}

discover_eip() {
  stage "Elastic IP (frontend edge)"
  local eip
  eip="$(aws ec2 describe-addresses \
    --filters "Name=tag:project,Values=${PROJECT_TAG}" "Name=tag:environment,Values=prod" \
    --query "Addresses[0].PublicIp" \
    --output text 2>/dev/null || true)"
  eip="$(normalize_aws_text "$eip")"

  if [[ -z "$eip" ]]; then
    eip="$(aws ec2 describe-addresses \
      --filters "Name=tag:Name,Values=matchcota-prod-frontend-edge-eip" \
      --query "Addresses[0].PublicIp" \
      --output text 2>/dev/null || true)"
    eip="$(normalize_aws_text "$eip")"
  fi

  if [[ -z "$eip" ]]; then
    stage "  WARNING: EIP not found"
  else
    stage "  found: ${eip}"
  fi

  TF_OUT_dns_apex_record_target_eip="$eip"
  TF_OUT_dns_wildcard_record_target_eip="$eip"
  TF_OUT_frontend_edge_host_for_deploy="$eip"
}

discover_route53() {
  stage "Route53 hosted zone"
  local zone_id
  zone_id="$(aws route53 list-hosted-zones-by-name \
    --dns-name "matchcota.tech" \
    --max-items 1 \
    --query "HostedZones[?Name=='matchcota.tech.'].Id | [0]" \
    --output text 2>/dev/null || true)"
  zone_id="$(normalize_aws_text "$zone_id")"
  # Strip /hostedzone/ prefix if present
  zone_id="${zone_id##*/}"

  if [[ -z "$zone_id" ]]; then
    stage "  WARNING: hosted zone not found"
  else
    stage "  found: ${zone_id}"
  fi

  TF_OUT_route53_hosted_zone_id="$zone_id"
}

discover_preboot_contract() {
  TF_OUT_frontend_tenant_preboot_contract='{"base_domain":"matchcota.tech","wildcard_domain":"*.matchcota.tech","preboot_endpoint":"/tenant-preboot.js","apex_status":"apex","tenant_fallback_status":"unresolved","invalid_host_status":"invalid","registration_success_target":"https://{slug}.matchcota.tech/","owner":"edge-nginx"}'
}

# ── Write .env.deploy ─────────────────────────────────────────────────────────

write_env_file() {
  local out="$DEPLOY_ENV_FILE"

  cat > "$out" <<EOF
# Auto-generated by discover-outputs.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Source: live AWS resource discovery (no Terraform state required)

# Lambda
TF_OUT_lambda_function_name='${TF_OUT_lambda_function_name}'
TF_OUT_api_gateway_invoke_url='${TF_OUT_api_gateway_invoke_url}'

# S3
TF_OUT_lambda_artifact_bucket_name='${TF_OUT_lambda_artifact_bucket_name}'
TF_OUT_lambda_artifact_object_key='${TF_OUT_lambda_artifact_object_key}'
TF_OUT_uploads_bucket_name='${TF_OUT_uploads_bucket_name}'

# RDS
TF_OUT_rds_endpoint='${TF_OUT_rds_endpoint}'
TF_OUT_rds_port='${TF_OUT_rds_port}'
TF_OUT_db_name='${TF_OUT_db_name}'
TF_OUT_db_username='${TF_OUT_db_username}'

# SSM
TF_OUT_ssm_db_password_parameter_name='${TF_OUT_ssm_db_password_parameter_name}'
TF_OUT_ssm_app_secret_key_parameter_name='${TF_OUT_ssm_app_secret_key_parameter_name}'
TF_OUT_ssm_jwt_secret_key_parameter_name='${TF_OUT_ssm_jwt_secret_key_parameter_name}'

# DNS / Frontend
TF_OUT_route53_hosted_zone_id='${TF_OUT_route53_hosted_zone_id}'
TF_OUT_dns_apex_record_target_eip='${TF_OUT_dns_apex_record_target_eip}'
TF_OUT_dns_wildcard_record_target_eip='${TF_OUT_dns_wildcard_record_target_eip}'
TF_OUT_frontend_edge_host_for_deploy='${TF_OUT_frontend_edge_host_for_deploy}'
TF_OUT_frontend_tenant_preboot_contract='${TF_OUT_frontend_tenant_preboot_contract}'
EOF

  stage "wrote ${out}"
}

# ── Main ──────────────────────────────────────────────────────────────────────

usage() {
  cat <<'USAGE'
Usage: infrastructure/scripts/discover-outputs.sh [--help]

Discover infrastructure values from live AWS resources and write
them to .env.deploy for use by deploy scripts when Terraform state
is not accessible (e.g. AWS Academy labs with restricted IAM).

Environment variables:
  AWS_PROFILE       AWS CLI profile (default: matchcota)
  AWS_REGION        AWS region (default: us-east-1)
  DEPLOY_ENV_FILE   Output file (default: .env.deploy)
  PROJECT_TAG       Tag used to find resources (default: matchcota)

Quick start:
  export AWS_PROFILE=matchcota
  bash infrastructure/scripts/discover-outputs.sh
  bash infrastructure/scripts/deploy-backend.sh
  bash infrastructure/scripts/deploy-frontend.sh
USAGE
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_cmd aws

  stage "verifying AWS credentials (profile=${AWS_PROFILE})"
  aws sts get-caller-identity >/dev/null

  discover_lambda
  discover_api_gateway
  discover_s3_buckets
  discover_rds
  discover_ssm_params
  discover_eip
  discover_route53
  discover_preboot_contract

  write_env_file

  local warnings=0
  for var in TF_OUT_lambda_function_name TF_OUT_api_gateway_invoke_url \
             TF_OUT_rds_endpoint TF_OUT_dns_apex_record_target_eip \
             TF_OUT_route53_hosted_zone_id; do
    if [[ -z "${!var:-}" ]]; then
      warnings=$((warnings + 1))
    fi
  done

  if [[ $warnings -gt 0 ]]; then
    stage "WARNING: ${warnings} value(s) could not be discovered — edit ${DEPLOY_ENV_FILE} manually"
  else
    stage "all values discovered successfully"
  fi

  stage "done — deploy scripts will source ${DEPLOY_ENV_FILE} automatically"
}

main "$@"
