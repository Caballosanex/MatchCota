#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
FRONTEND_DIR="frontend"
FRONTEND_DIST_DIR="${FRONTEND_DIR}/dist"
DEFAULT_DOCROOT="/usr/share/nginx/html"

AWS_PROFILE="${AWS_PROFILE:-matchcota}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"
TF_BACKEND_REGION="${TF_BACKEND_REGION:-us-east-1}"

FRONTEND_HOST="${FRONTEND_HOST:-}"
FRONTEND_SSH_USER="${FRONTEND_SSH_USER:-ec2-user}"
FRONTEND_SSH_KEY_PATH="${FRONTEND_SSH_KEY_PATH:-}"
FRONTEND_SSH_PORT="${FRONTEND_SSH_PORT:-22}"
FRONTEND_DOCROOT="${FRONTEND_DOCROOT:-$DEFAULT_DOCROOT}"

VITE_API_URL="${VITE_API_URL:-https://api.matchcota.tech}"
VITE_BASE_DOMAIN="${VITE_BASE_DOMAIN:-matchcota.tech}"
VITE_ENVIRONMENT="${VITE_ENVIRONMENT:-production}"

SSH_OPTS=()
RSYNC_SSH_CMD=()

export AWS_PROFILE

stage() {
  echo "[deploy-frontend] $1"
}

usage() {
  cat <<'USAGE'
Usage: infrastructure/scripts/deploy-frontend.sh [--help]

Builds and deploys frontend static assets to EC2 nginx document root.

Deployment contract:
  - Builds React frontend with production values:
      VITE_API_URL=https://api.matchcota.tech
      VITE_BASE_DOMAIN=matchcota.tech
      VITE_ENVIRONMENT=production
  - Publishes ONLY static frontend artifacts from frontend/dist
  - Performs NO backend runtime/process deployment on frontend host
  - Assumes wildcard DNS is already provisioned by Terraform (no per-tenant DNS mutation)

Required tools:
  bash, npm, terraform, rsync, ssh

Required environment:
  FRONTEND_HOST                EC2 hostname/IP for nginx frontend host

Optional environment:
  AWS_PROFILE                  AWS profile for Terraform output lookups (default: matchcota)
  TF_BACKEND_BUCKET            Terraform state bucket for first-time init (optional)
  TF_BACKEND_DYNAMODB_TABLE    Terraform lock table for first-time init (optional)
  TF_BACKEND_REGION            Terraform backend region (default: us-east-1)
  FRONTEND_SSH_USER            SSH user for EC2 host (default: ec2-user)
  FRONTEND_SSH_KEY_PATH        SSH private key path
  FRONTEND_SSH_PORT            SSH port (default: 22)
  FRONTEND_DOCROOT             nginx static document root (default: /usr/share/nginx/html)
  VITE_API_URL                 Frontend API origin (default: https://api.matchcota.tech)
  VITE_BASE_DOMAIN             Frontend base domain (default: matchcota.tech)
  VITE_ENVIRONMENT             Frontend environment flag (default: production)

Examples:
  FRONTEND_HOST=44.210.10.20 infrastructure/scripts/deploy-frontend.sh
  FRONTEND_HOST=ec2-1-2-3-4.compute-1.amazonaws.com FRONTEND_SSH_KEY_PATH=~/.ssh/matchcota.pem infrastructure/scripts/deploy-frontend.sh
USAGE
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    exit 1
  fi
}

configure_ssh_opts() {
  SSH_OPTS=(
    -p "$FRONTEND_SSH_PORT"
    -o BatchMode=yes
    -o StrictHostKeyChecking=accept-new
  )

  if [[ -n "$FRONTEND_SSH_KEY_PATH" ]]; then
    if [[ ! -f "$FRONTEND_SSH_KEY_PATH" ]]; then
      echo "ERROR: FRONTEND_SSH_KEY_PATH does not exist: $FRONTEND_SSH_KEY_PATH" >&2
      exit 1
    fi
    SSH_OPTS+=( -i "$FRONTEND_SSH_KEY_PATH" )
  fi

  RSYNC_SSH_CMD=(ssh)
  RSYNC_SSH_CMD+=("${SSH_OPTS[@]}")
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

verify_dns_contract() {
  stage "verify Terraform DNS contract outputs"
  local hosted_zone_id wildcard_eip apex_eip

  hosted_zone_id="$(terraform -chdir="$TF_ENV_DIR" output -raw route53_hosted_zone_id)"
  wildcard_eip="$(terraform -chdir="$TF_ENV_DIR" output -raw dns_wildcard_record_target_eip)"
  apex_eip="$(terraform -chdir="$TF_ENV_DIR" output -raw dns_apex_record_target_eip)"

  if [[ -z "$hosted_zone_id" || -z "$wildcard_eip" || -z "$apex_eip" ]]; then
    echo "ERROR: Missing required Terraform DNS outputs (route53_hosted_zone_id / dns_wildcard_record_target_eip / dns_apex_record_target_eip)." >&2
    exit 1
  fi

  stage "wildcard DNS contract detected (no per-tenant Route53 mutation needed)"
}

verify_inputs() {
  if [[ -z "$FRONTEND_HOST" ]]; then
    echo "ERROR: FRONTEND_HOST is required (EC2 nginx host/IP)." >&2
    echo "Run with FRONTEND_HOST=<host> infrastructure/scripts/deploy-frontend.sh" >&2
    exit 1
  fi

  if [[ "$VITE_ENVIRONMENT" != "production" ]]; then
    echo "ERROR: VITE_ENVIRONMENT must be 'production' for production deploy." >&2
    exit 1
  fi

  if [[ "$VITE_BASE_DOMAIN" != "matchcota.tech" ]]; then
    echo "ERROR: VITE_BASE_DOMAIN must be 'matchcota.tech' for production deploy." >&2
    exit 1
  fi

  if [[ "$VITE_API_URL" != "https://api.matchcota.tech" ]]; then
    echo "ERROR: VITE_API_URL must be 'https://api.matchcota.tech' for production deploy." >&2
    exit 1
  fi
}

build_frontend() {
  stage "install frontend dependencies"
  npm --prefix "$FRONTEND_DIR" ci

  stage "build frontend static assets"
  VITE_API_URL="$VITE_API_URL" \
  VITE_BASE_DOMAIN="$VITE_BASE_DOMAIN" \
  VITE_ENVIRONMENT="$VITE_ENVIRONMENT" \
    npm --prefix "$FRONTEND_DIR" run build

  if [[ ! -d "$FRONTEND_DIST_DIR" ]]; then
    echo "ERROR: Expected build output directory not found: $FRONTEND_DIST_DIR" >&2
    exit 1
  fi
}

publish_static_assets() {
  local remote="${FRONTEND_SSH_USER}@${FRONTEND_HOST}"

  stage "validate ssh connectivity"
  ssh "${SSH_OPTS[@]}" "$remote" "echo connected >/dev/null"

  stage "ensure nginx docroot exists and clear old static files"
  ssh "${SSH_OPTS[@]}" "$remote" "sudo mkdir -p '$FRONTEND_DOCROOT' && sudo rm -rf '$FRONTEND_DOCROOT'/*"

  stage "publish static dist/ via rsync"
  rsync -az --delete -e "${RSYNC_SSH_CMD[*]}" "$FRONTEND_DIST_DIR/" "$remote:/tmp/matchcota-frontend-dist/"

  stage "move static artifacts into nginx docroot"
  ssh "${SSH_OPTS[@]}" "$remote" "sudo rsync -a --delete /tmp/matchcota-frontend-dist/ '$FRONTEND_DOCROOT/' && rm -rf /tmp/matchcota-frontend-dist"
}

verify_static_only_posture() {
  local remote="${FRONTEND_SSH_USER}@${FRONTEND_HOST}"
  stage "verify static-only posture on frontend host"

  ssh "${SSH_OPTS[@]}" "$remote" "if pgrep -fa 'uvicorn|gunicorn|python.*app.main|python.*fastapi' >/dev/null; then echo 'ERROR: Backend runtime process detected on frontend host' >&2; exit 1; fi"
  ssh "${SSH_OPTS[@]}" "$remote" "test -f '$FRONTEND_DOCROOT/index.html'"

  stage "static-only verification passed (no backend runtime detected)"
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_cmd npm
  require_cmd terraform
  require_cmd ssh
  require_cmd rsync

  verify_inputs
  configure_ssh_opts
  ensure_terraform_initialized
  verify_dns_contract
  build_frontend
  publish_static_assets
  verify_static_only_posture

  stage "deploy complete"
  echo "frontend_host=${FRONTEND_HOST}"
  echo "frontend_docroot=${FRONTEND_DOCROOT}"
  echo "vite_api_url=${VITE_API_URL}"
  echo "vite_base_domain=${VITE_BASE_DOMAIN}"
  echo "vite_environment=${VITE_ENVIRONMENT}"
}

main "$@"
