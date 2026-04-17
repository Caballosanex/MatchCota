#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
DEFAULT_ARTIFACT_PATH="backend/dist/lambda.zip"
AWS_PROFILE="${AWS_PROFILE:-matchcota}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"
TF_BACKEND_REGION="${TF_BACKEND_REGION:-us-east-1}"
LAMBDA_ARTIFACT_PATH="${LAMBDA_ARTIFACT_PATH:-$DEFAULT_ARTIFACT_PATH}"

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
  Runtime secrets are resolved from SSM parameters managed by Terraform.
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

  stage "copy Alembic migration assets"
  mkdir -p "$BUILD_TMP_DIR/alembic"
  cp -R backend/alembic/. "$BUILD_TMP_DIR/alembic/"
  cp backend/alembic.ini "$BUILD_TMP_DIR/alembic.ini"

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
  local uploads_bucket_name ssm_db_param ssm_app_param ssm_jwt_param
  local db_host db_port db_name db_username
  local db_password app_secret_key jwt_secret_key encoded_db_password database_url

  lambda_function_name="$(terraform -chdir="$TF_ENV_DIR" output -raw lambda_function_name)"
  api_gateway_invoke_url="$(terraform -chdir="$TF_ENV_DIR" output -raw api_gateway_invoke_url)"
  lambda_artifact_bucket_name="$(terraform -chdir="$TF_ENV_DIR" output -raw lambda_artifact_bucket_name)"
  lambda_artifact_object_key="$(terraform -chdir="$TF_ENV_DIR" output -raw lambda_artifact_object_key)"
  uploads_bucket_name="$(terraform -chdir="$TF_ENV_DIR" output -raw uploads_bucket_name)"
  ssm_db_param="$(terraform -chdir="$TF_ENV_DIR" output -raw ssm_db_password_parameter_name)"
  ssm_app_param="$(terraform -chdir="$TF_ENV_DIR" output -raw ssm_app_secret_key_parameter_name)"
  ssm_jwt_param="$(terraform -chdir="$TF_ENV_DIR" output -raw ssm_jwt_secret_key_parameter_name)"
  db_host="$(terraform -chdir="$TF_ENV_DIR" output -raw rds_endpoint)"
  db_port="$(terraform -chdir="$TF_ENV_DIR" output -raw rds_port)"
  db_name="$(terraform -chdir="$TF_ENV_DIR" output -raw db_name)"
  db_username="$(terraform -chdir="$TF_ENV_DIR" output -raw db_username)"

  if [[ -z "$lambda_function_name" ]]; then
    echo "ERROR: Terraform output lambda_function_name is empty" >&2
    exit 1
  fi

  if [[ -z "$lambda_artifact_bucket_name" || -z "$lambda_artifact_object_key" ]]; then
    echo "ERROR: Terraform outputs for lambda artifact bucket/key are empty" >&2
    exit 1
  fi

  if [[ -z "$uploads_bucket_name" ]]; then
    echo "ERROR: Terraform output uploads_bucket_name is empty" >&2
    exit 1
  fi

  if [[ -z "$db_host" || -z "$db_port" || -z "$db_name" || -z "$db_username" ]]; then
    echo "ERROR: Terraform outputs for runtime database configuration are empty" >&2
    exit 1
  fi

  if [[ -z "$ssm_db_param" || -z "$ssm_app_param" || -z "$ssm_jwt_param" ]]; then
    echo "ERROR: Terraform outputs for runtime SSM parameter names are empty" >&2
    exit 1
  fi

  stage "verify SSM runtime secret prerequisites"
  aws ssm get-parameter --name "$ssm_db_param" >/dev/null
  aws ssm get-parameter --name "$ssm_app_param" >/dev/null
  aws ssm get-parameter --name "$ssm_jwt_param" >/dev/null

  stage "resolve runtime secret values from SSM"
  db_password="$(aws ssm get-parameter --name "$ssm_db_param" --with-decryption --query 'Parameter.Value' --output text)"
  app_secret_key="$(aws ssm get-parameter --name "$ssm_app_param" --with-decryption --query 'Parameter.Value' --output text)"
  jwt_secret_key="$(aws ssm get-parameter --name "$ssm_jwt_param" --with-decryption --query 'Parameter.Value' --output text)"

  if [[ -z "$db_password" || -z "$app_secret_key" || -z "$jwt_secret_key" ]]; then
    echo "ERROR: Runtime secret values are empty after SSM resolution" >&2
    exit 1
  fi

  encoded_db_password="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote_plus(sys.argv[1]))' "$db_password")"
  database_url="postgresql://${db_username}:${encoded_db_password}@${db_host}:${db_port}/${db_name}?sslmode=require"

  stage "lambda_function_name=${lambda_function_name}"
  stage "update Lambda runtime environment"
  aws lambda update-function-configuration \
    --function-name "$lambda_function_name" \
    --environment "Variables={ENVIRONMENT=production,DEBUG=false,S3_ENABLED=true,S3_BUCKET_NAME=${uploads_bucket_name},WILDCARD_DOMAIN=matchcota.tech,APP_AWS_REGION=us-east-1,DB_HOST=${db_host},DB_PORT=${db_port},DB_NAME=${db_name},DB_USERNAME=${db_username},DB_PASSWORD_SSM_PARAMETER=${ssm_db_param},APP_SECRET_KEY_SSM_PARAMETER=${ssm_app_param},JWT_SECRET_KEY_SSM_PARAMETER=${ssm_jwt_param},DATABASE_URL=${database_url},SECRET_KEY=${app_secret_key},JWT_SECRET_KEY=${jwt_secret_key},RUNTIME_SECRETS_BOOTSTRAPPED=true}" >/dev/null

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

  stage "run database migrations"
  local migration_response_file migration_invoke_output migration_status
  migration_response_file="$(mktemp)"
  migration_invoke_output="$(aws lambda invoke \
    --function-name "$lambda_function_name" \
    --cli-binary-format raw-in-base64-out \
    --payload '{"task":"migrate"}' \
    "$migration_response_file")"

  echo "$migration_invoke_output"
  cat "$migration_response_file"

  migration_status="$(python3 - "$migration_response_file" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text() or "{}")
if payload.get("status") == "ok":
    print("ok")
elif any(k in payload for k in ("statusCode", "errorMessage", "errorType")):
    print("[deploy-backend] ERROR: Lambda returned a handler error instead of a migration result. The migration handler may not be deployed correctly.", file=sys.stderr)
    print(payload.get("errorMessage", str(payload)), file=sys.stderr)
    print("error")
else:
    print(payload.get("status", "unknown"))
PY
)"
  rm -f "$migration_response_file"

  if [[ "$migration_status" != "ok" ]]; then
    echo "[deploy-backend] ERROR: migration failed, aborting deploy" >&2
    exit 1
  fi

  stage "migrations successful"

  stage "deploy complete"
  echo "lambda_function_name=${lambda_function_name}"
  echo "lambda_artifact_bucket_name=${lambda_artifact_bucket_name}"
  echo "lambda_artifact_object_key=${lambda_artifact_object_key}"
  echo "api_gateway_invoke_url=${api_gateway_invoke_url}"
}

main "$@"
