#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
DEFAULT_ARTIFACT_PATH="backend/dist/lambda.zip"
AWS_PROFILE="${AWS_PROFILE:-matchcota}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"
TF_BACKEND_REGION="${TF_BACKEND_REGION:-us-east-1}"
LAMBDA_ARTIFACT_PATH="${LAMBDA_ARTIFACT_PATH:-$DEFAULT_ARTIFACT_PATH}"
DB_PASSWORD="${DB_PASSWORD:-}"
APP_SECRET_KEY="${APP_SECRET_KEY:-}"
JWT_SECRET_KEY="${JWT_SECRET_KEY:-}"

export AWS_PROFILE

BUILD_TMP_DIR=""

usage() {
  cat <<'USAGE'
Usage: infrastructure/scripts/deploy-backend.sh

Environment variables:
  AWS_PROFILE                 AWS profile to use (default: matchcota)
  LAMBDA_ARTIFACT_PATH        Output zip path (default: backend/dist/lambda.zip)
  TF_BACKEND_BUCKET           Optional: Terraform state bucket for init
  TF_BACKEND_DYNAMODB_TABLE   Optional: Terraform lock table for init
  TF_BACKEND_REGION           Optional: Terraform backend region (default: us-east-1)
  DB_PASSWORD                 Required: RDS password used to construct DATABASE_URL
  APP_SECRET_KEY              Required: FastAPI SECRET_KEY runtime value
  JWT_SECRET_KEY              Required: JWT secret runtime value
USAGE
}

stage() {
  echo "[deploy-backend] $1"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  local value="$2"

  if [[ -z "$value" ]]; then
    echo "ERROR: Required environment variable is missing: ${name}" >&2
    exit 1
  fi
}

cleanup() {
  if [[ -n "$BUILD_TMP_DIR" && -d "$BUILD_TMP_DIR" ]]; then
    rm -rf "$BUILD_TMP_DIR"
  fi
}

ensure_terraform_initialized() {
  if [[ -d "$TF_ENV_DIR/.terraform" ]]; then
    return
  fi

  if [[ -z "$TF_BACKEND_BUCKET" || -z "$TF_BACKEND_DYNAMODB_TABLE" ]]; then
    echo "ERROR: Terraform is not initialized in $TF_ENV_DIR and TF_BACKEND_BUCKET / TF_BACKEND_DYNAMODB_TABLE are not set." >&2
    echo "Run terraform init in $TF_ENV_DIR or provide backend env vars." >&2
    exit 1
  fi

  stage "terraform init (remote backend)"
  terraform -chdir="$TF_ENV_DIR" init -reconfigure \
    -backend-config="bucket=${TF_BACKEND_BUCKET}" \
    -backend-config="dynamodb_table=${TF_BACKEND_DYNAMODB_TABLE}" \
    -backend-config="region=${TF_BACKEND_REGION}"
}

build_lambda_zip() {
  local artifact_dir
  artifact_dir="$(dirname "$LAMBDA_ARTIFACT_PATH")"

  mkdir -p "$artifact_dir"
  BUILD_TMP_DIR="$(mktemp -d)"

  stage "install Lambda-compatible binary wheels (no source builds)"
  python3 -m pip install --quiet \
    --only-binary=:all: \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --abi cp311 \
    --upgrade \
    -r backend/requirements.txt \
    --target "$BUILD_TMP_DIR"

  stage "copy backend application package"
  cp -R backend/app "$BUILD_TMP_DIR/app"

  stage "create Lambda artifact: $LAMBDA_ARTIFACT_PATH"
  rm -f "$LAMBDA_ARTIFACT_PATH"
  (
    cd "$BUILD_TMP_DIR"
    zip -qr "${OLDPWD}/${LAMBDA_ARTIFACT_PATH}" .
  )
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  trap cleanup EXIT

  require_cmd aws
  require_cmd terraform
  require_cmd python3
  require_cmd zip

  ensure_terraform_initialized
  build_lambda_zip

  stage "resolve Terraform runtime outputs"
  local lambda_function_name api_gateway_invoke_url lambda_artifact_bucket_name lambda_artifact_object_key
  local rds_endpoint rds_port db_name db_username uploads_bucket_name database_url

  require_env "DB_PASSWORD" "$DB_PASSWORD"
  require_env "APP_SECRET_KEY" "$APP_SECRET_KEY"
  require_env "JWT_SECRET_KEY" "$JWT_SECRET_KEY"

  lambda_function_name="$(terraform -chdir="$TF_ENV_DIR" output -raw lambda_function_name)"
  api_gateway_invoke_url="$(terraform -chdir="$TF_ENV_DIR" output -raw api_gateway_invoke_url)"
  lambda_artifact_bucket_name="$(terraform -chdir="$TF_ENV_DIR" output -raw lambda_artifact_bucket_name)"
  lambda_artifact_object_key="$(terraform -chdir="$TF_ENV_DIR" output -raw lambda_artifact_object_key)"
  rds_endpoint="$(terraform -chdir="$TF_ENV_DIR" output -raw rds_endpoint)"
  rds_port="$(terraform -chdir="$TF_ENV_DIR" output -raw rds_port)"
  db_name="$(terraform -chdir="$TF_ENV_DIR" output -raw db_name)"
  db_username="$(terraform -chdir="$TF_ENV_DIR" output -raw db_username)"
  uploads_bucket_name="$(terraform -chdir="$TF_ENV_DIR" output -raw uploads_bucket_name)"

  if [[ -z "$lambda_function_name" ]]; then
    echo "ERROR: Terraform output lambda_function_name is empty" >&2
    exit 1
  fi

  if [[ -z "$lambda_artifact_bucket_name" || -z "$lambda_artifact_object_key" ]]; then
    echo "ERROR: Terraform outputs for lambda artifact bucket/key are empty" >&2
    exit 1
  fi

  if [[ -z "$rds_endpoint" || -z "$rds_port" || -z "$db_name" || -z "$db_username" ]]; then
    echo "ERROR: Terraform outputs for runtime database configuration are empty" >&2
    exit 1
  fi

  if [[ -z "$uploads_bucket_name" ]]; then
    echo "ERROR: Terraform output uploads_bucket_name is empty" >&2
    exit 1
  fi

  database_url="postgresql://${db_username}:${DB_PASSWORD}@${rds_endpoint}:${rds_port}/${db_name}"

  stage "lambda_function_name=${lambda_function_name}"
  stage "update Lambda runtime environment"
  aws lambda update-function-configuration \
    --function-name "$lambda_function_name" \
    --environment "Variables={ENVIRONMENT=production,DEBUG=false,DATABASE_URL=${database_url},SECRET_KEY=${APP_SECRET_KEY},JWT_SECRET_KEY=${JWT_SECRET_KEY},S3_ENABLED=true,S3_BUCKET_NAME=${uploads_bucket_name},WILDCARD_DOMAIN=matchcota.tech,AWS_REGION=us-east-1}" >/dev/null

  stage "wait for Lambda runtime environment update"
  aws lambda wait function-updated --function-name "$lambda_function_name"

  stage "upload Lambda artifact to S3: s3://${lambda_artifact_bucket_name}/${lambda_artifact_object_key}"
  aws s3 cp "$LAMBDA_ARTIFACT_PATH" "s3://${lambda_artifact_bucket_name}/${lambda_artifact_object_key}" >/dev/null

  stage "update Lambda function code: ${lambda_function_name}"
  aws lambda update-function-code \
    --function-name "$lambda_function_name" \
    --s3-bucket "$lambda_artifact_bucket_name" \
    --s3-key "$lambda_artifact_object_key" \
    --publish >/dev/null

  stage "wait for Lambda function update to complete"
  aws lambda wait function-updated --function-name "$lambda_function_name"

  stage "deploy complete"
  echo "lambda_function_name=${lambda_function_name}"
  echo "lambda_artifact_bucket_name=${lambda_artifact_bucket_name}"
  echo "lambda_artifact_object_key=${lambda_artifact_object_key}"
  echo "api_gateway_invoke_url=${api_gateway_invoke_url}"
}

main "$@"
