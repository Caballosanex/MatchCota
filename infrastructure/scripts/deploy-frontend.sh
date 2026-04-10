#!/usr/bin/env bash

set -euo pipefail

TF_ENV_DIR="infrastructure/terraform/environments/prod"
FRONTEND_DIR="frontend"
FRONTEND_DIST_DIR="${FRONTEND_DIR}/dist"
DEFAULT_DOCROOT="/usr/share/nginx/html"

AWS_PROFILE="${AWS_PROFILE:-matchcota}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-}"
TF_BACKEND_DYNAMODB_TABLE="${TF_BACKEND_DYNAMODB_TABLE:-}"
TF_BACKEND_REGION="${TF_BACKEND_REGION:-us-east-1}"

FRONTEND_HOST="${FRONTEND_HOST:-}"
FRONTEND_SSH_USER="${FRONTEND_SSH_USER:-ec2-user}"
FRONTEND_SSH_KEY_PATH="${FRONTEND_SSH_KEY_PATH:-}"
FRONTEND_SSH_PORT="${FRONTEND_SSH_PORT:-22}"
FRONTEND_DOCROOT="${FRONTEND_DOCROOT:-$DEFAULT_DOCROOT}"
DEPLOY_TRANSPORT="${DEPLOY_TRANSPORT:-auto}"
FRONTEND_INSTANCE_ID="${FRONTEND_INSTANCE_ID:-}"
FRONTEND_SSM_TIMEOUT_SECONDS="${FRONTEND_SSM_TIMEOUT_SECONDS:-300}"
FRONTEND_SSM_POLL_SECONDS="${FRONTEND_SSM_POLL_SECONDS:-2}"
S3_STAGE_BUCKET="${S3_STAGE_BUCKET:-}"
KNOWN_TENANT_SLUG="${KNOWN_TENANT_SLUG:-}"
KNOWN_TENANT_HOST="${KNOWN_TENANT_HOST:-}"

VITE_API_URL="${VITE_API_URL:-https://api.matchcota.tech}"
VITE_BASE_DOMAIN="${VITE_BASE_DOMAIN:-matchcota.tech}"
VITE_ENVIRONMENT="${VITE_ENVIRONMENT:-production}"

SSH_OPTS=()
RSYNC_SSH_CMD=()
ACTIVE_TRANSPORT=""
RESOLVED_INSTANCE_ID=""
DIST_ARCHIVE=""
STAGED_S3_URI=""
VERIFY_ROUTE_CONTRACTS_ONLY="false"

export AWS_PROFILE

stage() {
  echo "[deploy-frontend] $1"
}

cleanup() {
  if [[ -n "$DIST_ARCHIVE" && -f "$DIST_ARCHIVE" ]]; then
    rm -f "$DIST_ARCHIVE"
  fi

  if [[ -n "$STAGED_S3_URI" ]]; then
    aws s3 rm "$STAGED_S3_URI" >/dev/null 2>&1 || true
  fi
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
  bash, npm, node, aws, terraform, curl, tar

Optional transport tools:
  ssh, rsync (required only for DEPLOY_TRANSPORT=ssh)

Required environment:
  FRONTEND_HOST                Optional EC2 hostname/IP override for nginx frontend host

Optional environment:
  AWS_PROFILE                  AWS profile for Terraform output lookups (default: matchcota)
  AWS_REGION                   AWS region for EC2/SSM lookups (default: us-east-1)
  TF_BACKEND_BUCKET            Terraform state bucket for first-time init (optional)
  TF_BACKEND_DYNAMODB_TABLE    Terraform lock table for first-time init (optional)
  TF_BACKEND_REGION            Terraform backend region (default: us-east-1)
  FRONTEND_SSH_USER            SSH user for EC2 host (default: ec2-user)
  FRONTEND_SSH_KEY_PATH        SSH private key path
  FRONTEND_SSH_PORT            SSH port (default: 22)
  FRONTEND_DOCROOT             nginx static document root (default: /usr/share/nginx/html)
  DEPLOY_TRANSPORT             Deployment channel: auto|ssh|ssm (default: auto)
  FRONTEND_INSTANCE_ID         EC2 instance id for SSM deploy path (optional)
  FRONTEND_SSM_TIMEOUT_SECONDS Max wait for SSM command completion (default: 300)
  FRONTEND_SSM_POLL_SECONDS    Poll interval for SSM command status (default: 2)
  S3_STAGE_BUCKET              Bucket for temporary dist archive during SSM deploy (default: Terraform output uploads_bucket_name)
  KNOWN_TENANT_SLUG            Known production tenant slug for route contract checks (required unless KNOWN_TENANT_HOST is set)
  KNOWN_TENANT_HOST            Known production tenant host override for route checks (optional)
  VITE_API_URL                 Frontend API origin (default: https://api.matchcota.tech)
  VITE_BASE_DOMAIN             Frontend base domain (default: matchcota.tech)
  VITE_ENVIRONMENT             Frontend environment flag (default: production)

Verification-only mode:
  --verify-route-contracts-only
    Runs live apex/tenant host-routing assertions without building or publishing artifacts.
    Useful for readiness orchestration stage checks.

Contract assertions include:
  - https://matchcota.tech/test and /home redirect to /
  - https://{known-slug}.matchcota.tech/register-tenant redirects to tenant root and does not expose registration
  - tenant root does not render apex marketing shell markers
  - /tenant-preboot.js returns deterministic host context status markers

Examples:
  FRONTEND_HOST=44.210.10.20 infrastructure/scripts/deploy-frontend.sh
  FRONTEND_HOST=ec2-1-2-3-4.compute-1.amazonaws.com FRONTEND_SSH_KEY_PATH=~/.ssh/matchcota.pem infrastructure/scripts/deploy-frontend.sh
  FRONTEND_HOST=18.210.253.176 DEPLOY_TRANSPORT=ssm infrastructure/scripts/deploy-frontend.sh
USAGE
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    exit 1
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      --verify-route-contracts-only)
        VERIFY_ROUTE_CONTRACTS_ONLY="true"
        ;;
      *)
        echo "ERROR: Unknown argument: $1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done
}

normalize_aws_text() {
  local value="$1"
  if [[ "$value" == "None" || "$value" == "null" || "$value" == "" ]]; then
    echo ""
  else
    echo "$value"
  fi
}

validate_docroot() {
  if [[ -z "$FRONTEND_DOCROOT" || "$FRONTEND_DOCROOT" == "/" ]]; then
    echo "ERROR: FRONTEND_DOCROOT must not be empty or '/'" >&2
    exit 1
  fi

  case "$FRONTEND_DOCROOT" in
    /usr/share/nginx/html|/usr/share/nginx/html/*)
      ;;
    *)
      echo "ERROR: FRONTEND_DOCROOT must stay under /usr/share/nginx/html" >&2
      exit 1
      ;;
  esac
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
  local hosted_zone_id wildcard_eip apex_eip preboot_contract

  hosted_zone_id="$(terraform -chdir="$TF_ENV_DIR" output -raw route53_hosted_zone_id)"
  wildcard_eip="$(terraform -chdir="$TF_ENV_DIR" output -raw dns_wildcard_record_target_eip)"
  apex_eip="$(terraform -chdir="$TF_ENV_DIR" output -raw dns_apex_record_target_eip)"
  preboot_contract="$(terraform -chdir="$TF_ENV_DIR" output -json frontend_tenant_preboot_contract 2>/dev/null || true)"

  if [[ -z "$hosted_zone_id" || -z "$wildcard_eip" || -z "$apex_eip" ]]; then
    echo "ERROR: Missing required Terraform DNS outputs (route53_hosted_zone_id / dns_wildcard_record_target_eip / dns_apex_record_target_eip)." >&2
    exit 1
  fi

  if [[ -z "$preboot_contract" || "$preboot_contract" == "null" ]]; then
    echo "ERROR: Missing required Terraform output frontend_tenant_preboot_contract for edge preboot verification." >&2
    exit 1
  fi

  stage "wildcard DNS contract detected (no per-tenant Route53 mutation needed)"
}

verify_inputs() {
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

  case "$DEPLOY_TRANSPORT" in
    auto|ssh|ssm)
      ;;
    *)
      echo "ERROR: DEPLOY_TRANSPORT must be one of: auto, ssh, ssm" >&2
      exit 1
      ;;
  esac

  validate_docroot
}

resolve_frontend_host() {
  local tf_host

  if [[ -n "$FRONTEND_HOST" ]]; then
    return
  fi

  stage "resolve FRONTEND_HOST from Terraform output frontend_edge_host_for_deploy"

  tf_host="$(terraform -chdir="$TF_ENV_DIR" output -raw frontend_edge_host_for_deploy 2>/dev/null || true)"
  tf_host="$(printf '%s' "$tf_host" | tr -d '\r\n')"

  if [[ -z "$tf_host" || "$tf_host" == "null" ]]; then
    echo "ERROR: FRONTEND_HOST was not provided and Terraform output frontend_edge_host_for_deploy is unavailable." >&2
    echo "Run runtime apply first (terraform-apply-layer.sh runtime) or set FRONTEND_HOST explicitly." >&2
    exit 1
  fi

  FRONTEND_HOST="$tf_host"
  stage "resolved frontend host from Terraform output: ${FRONTEND_HOST}"
}

verify_contract_inputs() {
  if [[ "$VITE_ENVIRONMENT" != "production" ]]; then
    echo "ERROR: VITE_ENVIRONMENT must be 'production' for production route contract verification." >&2
    exit 1
  fi

  if [[ "$VITE_BASE_DOMAIN" != "matchcota.tech" ]]; then
    echo "ERROR: VITE_BASE_DOMAIN must be 'matchcota.tech' for production route contract verification." >&2
    exit 1
  fi

  if [[ -z "$KNOWN_TENANT_HOST" && -z "$KNOWN_TENANT_SLUG" ]]; then
    echo "ERROR: Set KNOWN_TENANT_SLUG (or KNOWN_TENANT_HOST) so tenant route contracts can be verified." >&2
    exit 1
  fi
}

resolve_known_tenant_host() {
  if [[ -n "$KNOWN_TENANT_HOST" ]]; then
    echo "$KNOWN_TENANT_HOST"
    return 0
  fi

  if [[ "$KNOWN_TENANT_SLUG" =~ ^[a-z0-9-]+$ ]]; then
    echo "${KNOWN_TENANT_SLUG}.${VITE_BASE_DOMAIN}"
    return 0
  fi

  echo "ERROR: KNOWN_TENANT_SLUG must contain lowercase letters, numbers, or hyphens only." >&2
  exit 1
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

resolve_frontend_instance_id() {
  local candidate=""

  if [[ -n "$FRONTEND_INSTANCE_ID" ]]; then
    echo "$FRONTEND_INSTANCE_ID"
    return 0
  fi

  candidate="$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --filters "Name=instance-state-name,Values=running" "Name=ip-address,Values=$FRONTEND_HOST" \
    --query "Reservations[].Instances[].InstanceId | [0]" \
    --output text 2>/dev/null || true)"
  candidate="$(normalize_aws_text "$candidate")"

  if [[ -z "$candidate" ]]; then
    candidate="$(aws ec2 describe-instances \
      --region "$AWS_REGION" \
      --filters "Name=instance-state-name,Values=running" "Name=dns-name,Values=$FRONTEND_HOST" \
      --query "Reservations[].Instances[].InstanceId | [0]" \
      --output text 2>/dev/null || true)"
    candidate="$(normalize_aws_text "$candidate")"
  fi

  if [[ -z "$candidate" ]]; then
    return 1
  fi

  echo "$candidate"
}

ensure_ssm_online() {
  local instance_id="$1"
  local ping_status

  ping_status="$(aws ssm describe-instance-information \
    --region "$AWS_REGION" \
    --filters "Key=InstanceIds,Values=${instance_id}" \
    --query "InstanceInformationList[0].PingStatus" \
    --output text 2>/dev/null || true)"
  ping_status="$(normalize_aws_text "$ping_status")"

  if [[ "$ping_status" != "Online" ]]; then
    echo "ERROR: SSM instance '${instance_id}' is not online (status: ${ping_status:-unknown})." >&2
    return 1
  fi

  return 0
}

resolve_transport() {
  case "$DEPLOY_TRANSPORT" in
    ssh)
      ACTIVE_TRANSPORT="ssh"
      ;;
    ssm)
      if ! RESOLVED_INSTANCE_ID="$(resolve_frontend_instance_id)"; then
        echo "ERROR: Could not resolve FRONTEND_INSTANCE_ID for SSM deploy. Set FRONTEND_INSTANCE_ID explicitly." >&2
        exit 1
      fi
      ensure_ssm_online "$RESOLVED_INSTANCE_ID"
      ACTIVE_TRANSPORT="ssm"
      ;;
    auto)
      if RESOLVED_INSTANCE_ID="$(resolve_frontend_instance_id 2>/dev/null)"; then
        if ensure_ssm_online "$RESOLVED_INSTANCE_ID" >/dev/null 2>&1; then
          ACTIVE_TRANSPORT="ssm"
        else
          ACTIVE_TRANSPORT="ssh"
          RESOLVED_INSTANCE_ID=""
        fi
      else
        ACTIVE_TRANSPORT="ssh"
      fi
      ;;
  esac

  stage "deploy transport: ${ACTIVE_TRANSPORT}"
  if [[ "$ACTIVE_TRANSPORT" == "ssm" ]]; then
    stage "frontend instance id: ${RESOLVED_INSTANCE_ID}"
  fi
}

run_ssm_script() {
  local instance_id="$1"
  local comment="$2"
  local script_content="$3"
  local command_id
  local deadline
  local status
  local params_file

  params_file="$(mktemp -t matchcota-ssm-params).json"
  SCRIPT_CONTENT="$script_content" node -e 'const fs = require("fs"); const lines = (process.env.SCRIPT_CONTENT || "").split("\n"); fs.writeFileSync(process.argv[1], JSON.stringify({ commands: lines }));' "$params_file"

  command_id="$(aws ssm send-command \
    --region "$AWS_REGION" \
    --document-name "AWS-RunShellScript" \
    --instance-ids "$instance_id" \
    --comment "$comment" \
    --parameters "file://${params_file}" \
    --query "Command.CommandId" \
    --output text)"

  rm -f "$params_file"

  deadline=$(( $(date +%s) + FRONTEND_SSM_TIMEOUT_SECONDS ))

  while :; do
    status="$(aws ssm get-command-invocation \
      --region "$AWS_REGION" \
      --command-id "$command_id" \
      --instance-id "$instance_id" \
      --query "Status" \
      --output text 2>/dev/null || true)"

    case "$status" in
      Success)
        break
        ;;
      Pending|InProgress|Delayed|"")
        ;;
      Cancelled|TimedOut|Failed|Cancelling)
        echo "ERROR: SSM command failed with status '$status' (command-id: $command_id)" >&2
        aws ssm get-command-invocation \
          --region "$AWS_REGION" \
          --command-id "$command_id" \
          --instance-id "$instance_id" \
          --query "StandardOutputContent" \
          --output text 2>/dev/null || true
        aws ssm get-command-invocation \
          --region "$AWS_REGION" \
          --command-id "$command_id" \
          --instance-id "$instance_id" \
          --query "StandardErrorContent" \
          --output text 2>/dev/null || true >&2
        exit 1
        ;;
      *)
        ;;
    esac

    if [[ $(date +%s) -ge "$deadline" ]]; then
      echo "ERROR: Timed out waiting for SSM command $command_id" >&2
      exit 1
    fi

    sleep "$FRONTEND_SSM_POLL_SECONDS"
  done

  aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$command_id" \
    --instance-id "$instance_id" \
    --query "StandardOutputContent" \
    --output text
}

configure_nginx_and_verify_script() {
  local artifact_copy_cmd="$1"

  cat <<EOF
set -euo pipefail

DOCROOT='${FRONTEND_DOCROOT}'

if [[ -z "\$DOCROOT" || "\$DOCROOT" == "/" ]]; then
  echo "ERROR: invalid FRONTEND_DOCROOT" >&2
  exit 1
fi

case "\$DOCROOT" in
  /usr/share/nginx/html|/usr/share/nginx/html/*) ;;
  *)
    echo "ERROR: FRONTEND_DOCROOT must stay under /usr/share/nginx/html" >&2
    exit 1
    ;;
esac

if [[ ! -f /etc/letsencrypt/live/matchcota.tech/fullchain.pem || ! -f /etc/letsencrypt/live/matchcota.tech/privkey.pem ]]; then
  echo "ERROR: expected TLS certificate files not found" >&2
  exit 1
fi

TMP_DIR=\"\$(mktemp -d /tmp/matchcota-frontend-XXXXXX)\"
trap 'rm -rf "\$TMP_DIR"' EXIT

${artifact_copy_cmd}

sudo mkdir -p "\$DOCROOT"
sudo rm -rf "\$DOCROOT"/*
sudo rsync -a --delete "\$TMP_DIR/dist/" "\$DOCROOT/"

cat >"\$TMP_DIR/matchcota-http.conf" <<'EOF_HTTP'
server {
    listen 80;
    server_name matchcota.tech *.matchcota.tech;
    return 301 https://\$host\$request_uri;
}
EOF_HTTP

cat >"\$TMP_DIR/matchcota-https.conf" <<'EOF_HTTPS'
server {
    listen 443 ssl;
    server_name matchcota.tech *.matchcota.tech;

    ssl_certificate /etc/letsencrypt/live/matchcota.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matchcota.tech/privkey.pem;

    root __MATCHCOTA_DOCROOT__;
    index index.html;

    set \$matchcota_preboot_status "invalid";
    set \$matchcota_preboot_slug "";

    if (\$host = matchcota.tech) {
        set \$matchcota_preboot_status "apex";
    }

    if (\$host ~ ^([a-z0-9-]+)\.matchcota\.tech$) {
        set \$matchcota_preboot_status "unresolved";
        set \$matchcota_preboot_slug \$1;
    }

    location = /tenant-preboot.js {
        default_type application/javascript;
        add_header Cache-Control "no-store";
        return 200 "window.__MATCHCOTA_TENANT_PREBOOT__={\"host\":\"\$host\",\"baseDomain\":\"matchcota.tech\",\"tenantSlug\":\"\$matchcota_preboot_slug\",\"tenantName\":\"\",\"status\":\"\$matchcota_preboot_status\"};";
    }

    # Enforce host-specific routing contracts at the edge before SPA fallback:
    # - Apex host must redirect tenant-only public paths to /
    # - Tenant hosts must not expose registration path
    location ~ ^/(test|home)(/.*)?$ {
        if (\$host = matchcota.tech) {
            return 302 /;
        }
        try_files \$uri /index.html;
    }

    location ~ ^/register-tenant(/.*)?$ {
        if (\$host ~ ^[a-z0-9-]+\.matchcota\.tech$) {
            return 302 /;
        }
        try_files \$uri /index.html;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF_HTTPS

sed -i 's|__MATCHCOTA_DOCROOT__|'"\$DOCROOT"'|g' "\$TMP_DIR/matchcota-https.conf"

sudo install -m 0644 "\$TMP_DIR/matchcota-http.conf" /etc/nginx/conf.d/matchcota-http.conf
sudo install -m 0644 "\$TMP_DIR/matchcota-https.conf" /etc/nginx/conf.d/matchcota-https.conf

sudo nginx -t
sudo systemctl reload nginx

if pgrep -fa 'uvicorn|gunicorn|python.*app.main|python.*fastapi' >/dev/null; then
  echo 'ERROR: Backend runtime process detected on frontend host' >&2
  exit 1
fi

test -f "\$DOCROOT/index.html"
EOF
}

publish_static_assets() {
  local remote
  local remote_script
  local artifact_key

  if [[ "$ACTIVE_TRANSPORT" == "ssh" ]]; then
    remote="${FRONTEND_SSH_USER}@${FRONTEND_HOST}"
    stage "validate ssh connectivity"
    ssh "${SSH_OPTS[@]}" "$remote" "echo connected >/dev/null"

    stage "publish static dist/ via rsync"
    rsync -az --delete -e "${RSYNC_SSH_CMD[*]}" "$FRONTEND_DIST_DIR/" "$remote:/tmp/matchcota-frontend-dist/"

    remote_script="$(configure_nginx_and_verify_script "mkdir -p \"\$TMP_DIR/dist\" && rsync -a --delete /tmp/matchcota-frontend-dist/ \"\$TMP_DIR/dist/\" && rm -rf /tmp/matchcota-frontend-dist")"

    stage "configure nginx for SPA routing and verify static-only posture"
    ssh "${SSH_OPTS[@]}" "$remote" "bash -s" <<< "$remote_script"
    stage "static-only verification passed (no backend runtime detected)"
    return
  fi

  if [[ -z "$S3_STAGE_BUCKET" ]]; then
    S3_STAGE_BUCKET="$(terraform -chdir="$TF_ENV_DIR" output -raw uploads_bucket_name)"
  fi

  if [[ -z "$S3_STAGE_BUCKET" ]]; then
    echo "ERROR: Could not resolve S3_STAGE_BUCKET for SSM transport." >&2
    exit 1
  fi

  DIST_ARCHIVE="$(mktemp -t matchcota-frontend-dist).tar.gz"
  stage "package frontend dist archive"
  COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 tar -C "$FRONTEND_DIST_DIR" -czf "$DIST_ARCHIVE" .

  artifact_key="deploy/frontend/$(date -u +%Y%m%dT%H%M%SZ)-dist.tar.gz"
  STAGED_S3_URI="s3://${S3_STAGE_BUCKET}/${artifact_key}"

  stage "upload dist archive to ${STAGED_S3_URI}"
  aws s3 cp "$DIST_ARCHIVE" "$STAGED_S3_URI" >/dev/null

  remote_script="$(configure_nginx_and_verify_script "aws s3 cp '$STAGED_S3_URI' \"\$TMP_DIR/frontend-dist.tar.gz\" >/dev/null && mkdir -p \"\$TMP_DIR/dist\" && tar -xzf \"\$TMP_DIR/frontend-dist.tar.gz\" -C \"\$TMP_DIR/dist\"")"

  stage "publish static assets through SSM and verify static-only posture"
  run_ssm_script "$RESOLVED_INSTANCE_ID" "Deploy MatchCota frontend static assets" "$remote_script" >/dev/null
  stage "static-only verification passed (no backend runtime detected)"
}

verify_public_route_contract() {
  local url
  local body

  url="https://${VITE_BASE_DOMAIN}/register-tenant"
  stage "verify public route contract: ${url}"

  body="$(curl -fsSL "$url")"

  if [[ "$body" == *"matchcota edge tls ok"* ]]; then
    echo "ERROR: ${url} still returns edge TLS marker response." >&2
    exit 1
  fi

  if [[ "$body" != *"<!DOCTYPE html"* && "$body" != *"<!doctype html"* ]]; then
    echo "ERROR: ${url} did not return the SPA HTML shell." >&2
    exit 1
  fi

  stage "public route contract passed"
}

assert_redirect_to_root() {
  local host="$1"
  local path="$2"
  local contract_name="$3"
  local url
  local headers_file
  local status
  local location

  url="https://${host}${path}"
  headers_file="$(mktemp -t matchcota-contract-headers)"

  status="$(curl -sS -o /dev/null -D "$headers_file" -w "%{http_code}" "$url")"
  location="$(tr -d '\r' < "$headers_file" | sed -n 's/^Location:[[:space:]]*//Ip' | head -n 1)"
  rm -f "$headers_file"

  case "$status" in
    301|302|307|308)
      ;;
    *)
      echo "ERROR: Contract fail (${contract_name}) - expected redirect status for ${url}, got HTTP ${status}." >&2
      exit 1
      ;;
  esac

  case "$location" in
    "/"|"https://${host}/"|"https://${host}")
      ;;
    *)
      echo "ERROR: Contract fail (${contract_name}) - expected redirect target '/' for ${url}, got '${location:-<missing>}'" >&2
      exit 1
      ;;
  esac
}

assert_not_contains_marker() {
  local haystack="$1"
  local marker="$2"
  local contract_name="$3"

  if [[ "$haystack" == *"$marker"* ]]; then
    echo "ERROR: Contract fail (${contract_name}) - found forbidden marker '${marker}'." >&2
    exit 1
  fi
}

assert_contains_marker() {
  local haystack="$1"
  local marker="$2"
  local contract_name="$3"

  if [[ "$haystack" != *"$marker"* ]]; then
    echo "ERROR: Contract fail (${contract_name}) - missing expected marker '${marker}'." >&2
    exit 1
  fi
}

verify_registration_landing_contract() {
  local register_tenant_file="frontend/src/pages/public/RegisterTenant.jsx"

  if [[ ! -f "$register_tenant_file" ]]; then
    echo "ERROR: Contract fail (registration landing) - source file not found: $register_tenant_file" >&2
    exit 1
  fi

  if ! grep -Fq 'https://${tenantSlug}.matchcota.tech/' "$register_tenant_file"; then
    echo "ERROR: Contract fail (registration landing) - tenant root URL contract missing in RegisterTenant flow." >&2
    exit 1
  fi

  if grep -Fq '${tenantSlug}.matchcota.tech/login' "$register_tenant_file"; then
    echo "ERROR: Contract fail (registration landing) - login path detected in registration redirect contract." >&2
    exit 1
  fi
}

verify_tenant_preboot_contract() {
  local apex_host="$1"
  local tenant_host="$2"
  local apex_preboot
  local tenant_preboot

  stage "verify apex preboot contract for https://${apex_host}/tenant-preboot.js"
  apex_preboot="$(curl -fsSL "https://${apex_host}/tenant-preboot.js")"
  assert_contains_marker "$apex_preboot" '"status":"apex"' "apex preboot status"
  assert_contains_marker "$apex_preboot" '"tenantSlug":""' "apex preboot tenant slug empty"

  stage "verify tenant preboot contract for https://${tenant_host}/tenant-preboot.js"
  tenant_preboot="$(curl -fsSL "https://${tenant_host}/tenant-preboot.js")"
  assert_contains_marker "$tenant_preboot" 'window.__MATCHCOTA_TENANT_PREBOOT__=' "tenant preboot payload declaration"
  assert_contains_marker "$tenant_preboot" '"status":"unresolved"' "tenant preboot unresolved fallback status"
  assert_contains_marker "$tenant_preboot" '"tenantSlug":"' "tenant preboot slug marker"

  if [[ "$tenant_preboot" == *'"tenantSlug":""'* ]]; then
    echo "ERROR: Contract fail (tenant preboot) - tenant host preboot payload returned empty tenantSlug." >&2
    exit 1
  fi
}

verify_host_routing_contracts() {
  local apex_host
  local tenant_host
  local tenant_root_body
  local tenant_register_body

  verify_contract_inputs

  apex_host="$VITE_BASE_DOMAIN"
  tenant_host="$(resolve_known_tenant_host)"

  stage "verify apex host-routing contracts for https://${apex_host}/test and https://${apex_host}/home"
  assert_redirect_to_root "$apex_host" "/test" "apex /test redirect"
  assert_redirect_to_root "$apex_host" "/home" "apex /home redirect"

  stage "verify tenant register-tenant contract for https://${tenant_host}/register-tenant"
  assert_redirect_to_root "$tenant_host" "/register-tenant" "tenant register-tenant redirect"

  tenant_register_body="$(curl -fsSL "https://${tenant_host}/register-tenant")"
  assert_not_contains_marker "$tenant_register_body" "RegisterTenant" "tenant register-tenant no registration shell"
  assert_not_contains_marker "$tenant_register_body" "Registrar Protectora" "tenant register-tenant no apex CTA"

  stage "verify tenant root contract (tenant root must not render apex marketing shell markers)"
  tenant_root_body="$(curl -fsSL "https://${tenant_host}/")"
  assert_not_contains_marker "$tenant_root_body" "Plataforma per connectar protectores amb adoptants" "tenant root not apex shell"
  assert_not_contains_marker "$tenant_root_body" "Registrar Protectora" "tenant root no apex registration CTA"
  assert_not_contains_marker "$tenant_root_body" "matchcota edge tls ok" "tenant root no edge probe shell"

  stage "verify registration success contract in frontend source"
  verify_registration_landing_contract

  stage "verify tenant preboot endpoint contract"
  verify_tenant_preboot_contract "$apex_host" "$tenant_host"

  stage "tenant root host-routing contracts passed"
}

main() {
  parse_args "$@"

  trap cleanup EXIT

  require_cmd curl

  if [[ "$VERIFY_ROUTE_CONTRACTS_ONLY" == "true" ]]; then
    verify_host_routing_contracts
    stage "frontend host-routing contract verification complete"
    exit 0
  fi

  require_cmd npm
  require_cmd node
  require_cmd terraform
  require_cmd aws
  require_cmd tar

  verify_inputs
  ensure_terraform_initialized
  resolve_frontend_host
  verify_dns_contract
  resolve_transport

  if [[ "$ACTIVE_TRANSPORT" == "ssh" ]]; then
    require_cmd ssh
    require_cmd rsync
    configure_ssh_opts
  fi

  build_frontend
  publish_static_assets
  verify_public_route_contract
  verify_host_routing_contracts

  stage "deploy complete"
  echo "deploy_transport=${ACTIVE_TRANSPORT}"
  echo "frontend_host=${FRONTEND_HOST}"
  if [[ "$ACTIVE_TRANSPORT" == "ssm" ]]; then
    echo "frontend_instance_id=${RESOLVED_INSTANCE_ID}"
  fi
  echo "frontend_docroot=${FRONTEND_DOCROOT}"
  echo "vite_api_url=${VITE_API_URL}"
  echo "vite_base_domain=${VITE_BASE_DOMAIN}"
  echo "vite_environment=${VITE_ENVIRONMENT}"
}

main "$@"
