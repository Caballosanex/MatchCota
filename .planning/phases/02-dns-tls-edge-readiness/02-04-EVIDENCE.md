# Phase 02-04 Execution Evidence

## Environment

- Timestamp (UTC): 2026-04-09T00:00:00Z
- AWS_PROFILE: `matchcota`
- AWS_REGION: `us-east-1`
- AWS_DEFAULT_REGION: `us-east-1`
- TF_BACKEND_BUCKET: `matchcota-tfstate-788602800812-us-east-1`
- TF_BACKEND_DYNAMODB_TABLE: `matchcota-terraform-locks`
- TF_BACKEND_REGION: `us-east-1`

## Task 1 — Preflight and Layered Apply

### Preflight

- Timestamp (UTC): 2026-04-08T23:16:00Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
TF_BACKEND_BUCKET="matchcota-tfstate-788602800812-us-east-1" \
TF_BACKEND_DYNAMODB_TABLE="matchcota-terraform-locks" TF_BACKEND_REGION="us-east-1" \
TF_VAR_terraform_state_bucket="matchcota-tfstate-788602800812-us-east-1" \
TF_VAR_terraform_lock_table="matchcota-terraform-locks" \
TF_VAR_frontend_elastic_ip="18.210.253.176" \
TF_VAR_api_gateway_alias_target_name="3g39efuo3j.execute-api.us-east-1.amazonaws.com" \
TF_VAR_api_gateway_alias_target_zone_id="Z1UJRXOUMOOFQ8" \
bash infrastructure/scripts/terraform-preflight.sh
```

- Exit code: `0`
- Output excerpt:

```text
[preflight] verifying Terraform version
[preflight] verifying AWS region is us-east-1
[preflight] verifying AWS credentials with STS
[preflight] PASS
```

### Apply — foundation

- Timestamp (UTC): 2026-04-08T23:20:00Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
TF_BACKEND_BUCKET="matchcota-tfstate-788602800812-us-east-1" \
TF_BACKEND_DYNAMODB_TABLE="matchcota-terraform-locks" TF_BACKEND_REGION="us-east-1" \
TF_VAR_terraform_state_bucket="matchcota-tfstate-788602800812-us-east-1" \
TF_VAR_terraform_lock_table="matchcota-terraform-locks" \
TF_VAR_frontend_elastic_ip="18.210.253.176" \
TF_VAR_api_gateway_alias_target_name="3g39efuo3j.execute-api.us-east-1.amazonaws.com" \
TF_VAR_api_gateway_alias_target_zone_id="Z1UJRXOUMOOFQ8" \
bash infrastructure/scripts/terraform-apply-layer.sh foundation
```

- Exit code: `0`
- Output excerpt:

```text
[apply-layer] layer=foundation target=terraform_data.academy_guardrails
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

### Apply — network

- Timestamp (UTC): 2026-04-08T23:20:30Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
TF_BACKEND_BUCKET="matchcota-tfstate-788602800812-us-east-1" \
TF_BACKEND_DYNAMODB_TABLE="matchcota-terraform-locks" TF_BACKEND_REGION="us-east-1" \
TF_VAR_terraform_state_bucket="matchcota-tfstate-788602800812-us-east-1" \
TF_VAR_terraform_lock_table="matchcota-terraform-locks" \
TF_VAR_frontend_elastic_ip="18.210.253.176" \
TF_VAR_api_gateway_alias_target_name="3g39efuo3j.execute-api.us-east-1.amazonaws.com" \
TF_VAR_api_gateway_alias_target_zone_id="Z1UJRXOUMOOFQ8" \
bash infrastructure/scripts/terraform-apply-layer.sh network
```

- Exit code: `0`
- Output excerpt:

```text
[apply-layer] layer=network target=aws_route53_zone.primary
aws_route53_zone.primary: Creation complete ... [id=Z00548306NDDNO28UJT9]
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

### Apply — data

- Timestamp (UTC): 2026-04-08T23:21:30Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
TF_BACKEND_BUCKET="matchcota-tfstate-788602800812-us-east-1" \
TF_BACKEND_DYNAMODB_TABLE="matchcota-terraform-locks" TF_BACKEND_REGION="us-east-1" \
TF_VAR_terraform_state_bucket="matchcota-tfstate-788602800812-us-east-1" \
TF_VAR_terraform_lock_table="matchcota-terraform-locks" \
TF_VAR_frontend_elastic_ip="18.210.253.176" \
TF_VAR_api_gateway_alias_target_name="3g39efuo3j.execute-api.us-east-1.amazonaws.com" \
TF_VAR_api_gateway_alias_target_zone_id="Z1UJRXOUMOOFQ8" \
bash infrastructure/scripts/terraform-apply-layer.sh data
```

- Exit code: `0`
- Output excerpt:

```text
[apply-layer] layer=data target=aws_route53_record.apex_a,aws_route53_record.wildcard_a,aws_route53_record.api_alias_a
aws_route53_record.apex_a: Creation complete ...
aws_route53_record.wildcard_a: Creation complete ...
aws_route53_record.api_alias_a: Creation complete ...
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

### Apply — runtime

- Timestamp (UTC): 2026-04-08T23:22:30Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
TF_BACKEND_BUCKET="matchcota-tfstate-788602800812-us-east-1" \
TF_BACKEND_DYNAMODB_TABLE="matchcota-terraform-locks" TF_BACKEND_REGION="us-east-1" \
TF_VAR_terraform_state_bucket="matchcota-tfstate-788602800812-us-east-1" \
TF_VAR_terraform_lock_table="matchcota-terraform-locks" \
TF_VAR_frontend_elastic_ip="18.210.253.176" \
TF_VAR_api_gateway_alias_target_name="3g39efuo3j.execute-api.us-east-1.amazonaws.com" \
TF_VAR_api_gateway_alias_target_zone_id="Z1UJRXOUMOOFQ8" \
bash infrastructure/scripts/terraform-apply-layer.sh runtime
```

- Exit code: `0`
- Output excerpt:

```text
[apply-layer] layer=runtime target=aws_acm_certificate.api_custom_domain
aws_acm_certificate.api_custom_domain: Creation complete ...
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

## Route53 Delegation Output

- Timestamp (UTC): 2026-04-08T23:23:00Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
TF_VAR_terraform_state_bucket="matchcota-tfstate-788602800812-us-east-1" \
TF_VAR_terraform_lock_table="matchcota-terraform-locks" \
TF_VAR_frontend_elastic_ip="18.210.253.176" \
TF_VAR_api_gateway_alias_target_name="3g39efuo3j.execute-api.us-east-1.amazonaws.com" \
TF_VAR_api_gateway_alias_target_zone_id="Z1UJRXOUMOOFQ8" \
terraform -chdir=infrastructure/terraform/environments/prod output route53_hosted_zone_name_servers
```

- Exit code: `0`
- Output:

```text
tolist([
  "ns-1301.awsdns-34.org",
  "ns-1751.awsdns-26.co.uk",
  "ns-340.awsdns-42.com",
  "ns-665.awsdns-19.net",
])
```

## Notes (Blocking issues auto-fixed during Task 1)

1. Initial backend init failed due to empty backend placeholders in `backend.tf`; execution now supplies backend values through `terraform-apply-layer.sh` environment-driven `-backend-config` arguments.
2. Initial layer mapping targeted non-existent module paths; layer targets were corrected to real root resources (`terraform_data.academy_guardrails`, `aws_route53_zone.primary`, Route53 record resources, and `aws_acm_certificate.api_custom_domain`).
3. Intermittent local lock contention occurred once during `terraform init`; rerun succeeded and execution continued.

## Task 2 — Registrar Delegation Checkpoint

- Timestamp (UTC): 2026-04-08T23:27:00Z
- Checkpoint confirmation: `delegation-complete`
- Manual action recorded: DotTech authoritative nameservers updated to match `route53_hosted_zone_name_servers` exactly.
- Resume command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
bash infrastructure/scripts/dns-delegation-check.sh \
  --domain matchcota.tech \
  --wildcard-sample smoke.matchcota.tech \
  --api-host api.matchcota.tech \
  --timeout 900 \
  --interval 30
```

## Task 3 — DNS/TLS Readiness Gates

### Propagation hold before first attempt

- Timestamp (UTC): 2026-04-08T23:27:30Z
- Operator note honored: waited ~12 minutes before first gate execution.

### Attempt 1 (post-wait)

#### DNS gate

- Timestamp (UTC): 2026-04-08T23:39:11Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
bash infrastructure/scripts/dns-delegation-check.sh \
  --domain matchcota.tech \
  --wildcard-sample smoke.matchcota.tech \
  --api-host api.matchcota.tech \
  --timeout 900 \
  --interval 30
```

- Exit code: `2`
- Output excerpt:

```text
FAIL delegation NS mismatch
PASS apex A records for matchcota.tech => 18.210.253.176
PASS wildcard sample A records for smoke.matchcota.tech => 18.210.253.176
PASS api host A records for api.matchcota.tech => <varied API Gateway IPs>
STATUS: blocked-waiting-for-delegation
FAIL: propagation timeout reached after 900s
RESUME: bash infrastructure/scripts/dns-delegation-check.sh ...
```

#### TLS gate

- Timestamp (UTC): 2026-04-08T23:39:11Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
bash infrastructure/scripts/tls-readiness-check.sh \
  --apex matchcota.tech \
  --wildcard-sample smoke.matchcota.tech \
  --api api.matchcota.tech \
  --timeout 900 \
  --interval 30
```

- Exit code: `2`
- Output excerpt:

```text
SUMMARY apex=FAIL wildcard=FAIL api=FAIL
OVERALL: FAIL (timeout 900s reached)
RESUME: bash infrastructure/scripts/tls-readiness-check.sh ...
```

### Rule 1 auto-fix during Task 3

- Issue: DNS checker compared expected/observed NS strings with inconsistent newline escaping, causing false mismatch even when values matched.
- Fix: updated `infrastructure/scripts/dns-delegation-check.sh` to print normalized expected NS with real newline separators (`"\n"`) in Python output formatting.

### Attempt 2 (after DNS script fix)

#### DNS gate

- Timestamp (UTC): 2026-04-08T23:55:05Z
- Exit code: `0`
- PASS markers:

```text
PASS delegation NS match
PASS apex A records for matchcota.tech => 18.210.253.176
PASS wildcard sample A records for smoke.matchcota.tech => 18.210.253.176
PASS api host A records for api.matchcota.tech => 3.232.243.145, 34.231.183.215
OVERALL: PASS all DNS/delegation checks
```

#### TLS gate

- Timestamp (UTC): 2026-04-08T23:55:11Z
- Exit code: `2`
- Output excerpt:

```text
SUMMARY apex=FAIL wildcard=FAIL api=FAIL
OVERALL: FAIL (timeout 900s reached)
RESUME: bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 900 --interval 30
```

### Current status

- DNS/delegation gate: **PASS**
- TLS readiness gate: **blocked (timeout)** pending certificate issuance/attachment for apex/wildcard edge and API domain.

### Continuation checkpoint (human action complete)

- Timestamp (UTC): 2026-04-09T00:30:40Z
- Confirmation: `tls-ready`
- Operator note: TLS prerequisites completed for edge (`matchcota.tech`, wildcard) and API (`api.matchcota.tech`).

### Final validation run (post TLS readiness)

#### DNS gate

- Timestamp (UTC): 2026-04-09T00:30:59Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
bash infrastructure/scripts/dns-delegation-check.sh \
  --domain matchcota.tech \
  --wildcard-sample smoke.matchcota.tech \
  --api-host api.matchcota.tech \
  --timeout 900 \
  --interval 30
```

- Exit code: `0`
- PASS markers:

```text
PASS delegation NS match
PASS apex A records for matchcota.tech => 18.210.253.176
PASS wildcard sample A records for smoke.matchcota.tech => 18.210.253.176
PASS api host A records for api.matchcota.tech => 52.0.251.60, 54.157.182.250
OVERALL: PASS all DNS/delegation checks
```

#### TLS gate

- Timestamp (UTC): 2026-04-09T00:30:59Z
- Command:

```bash
AWS_PROFILE="matchcota" AWS_REGION="us-east-1" AWS_DEFAULT_REGION="us-east-1" \
bash infrastructure/scripts/tls-readiness-check.sh \
  --apex matchcota.tech \
  --wildcard-sample smoke.matchcota.tech \
  --api api.matchcota.tech \
  --timeout 900 \
  --interval 30
```

- Exit code: `0`
- PASS markers:

```text
PASS apex TLS hostname/certificate check (matchcota.tech)
PASS wildcard TLS hostname/certificate check (smoke.matchcota.tech)
PASS api TLS hostname/certificate check (api.matchcota.tech)
SUMMARY apex=PASS wildcard=PASS api=PASS
OVERALL: PASS all domain classes passed TLS readiness
```

### Final status

- DNS/delegation gate: **PASS**
- TLS readiness gate: **PASS**
- Phase 02-04 live verification gaps closed with timestamped evidence.

---

## 2026-04-09 TLS Codification Reconciliation (Phase 02.1 follow-up)

### Objective

- Close remaining TLS codification drift by reconciling Terraform state with live API custom-domain resources and updating wildcard edge TLS bootstrap guidance to DNS-01-safe operations.

### Terraform import + drift reconciliation

- Timestamp (UTC): 2026-04-09T01:00:00Z
- Environment:
  - `AWS_PROFILE=matchcota`
  - `AWS_REGION=us-east-1`
  - `AWS_DEFAULT_REGION=us-east-1`
  - `TF_VAR_aws_profile=matchcota`
  - `TF_VAR_terraform_state_bucket=matchcota-tfstate-788602800812-us-east-1`
  - `TF_VAR_terraform_lock_table=matchcota-terraform-locks`
  - `TF_VAR_frontend_elastic_ip=18.210.253.176`
  - `TF_VAR_api_gateway_http_api_id=3g39efuo3j`

#### Imports executed

```bash
terraform -chdir=infrastructure/terraform/environments/prod import "aws_apigatewayv2_domain_name.api_custom_domain[0]" api.matchcota.tech
terraform -chdir=infrastructure/terraform/environments/prod import "aws_apigatewayv2_api_mapping.api_default[0]" exemv3/api.matchcota.tech
terraform -chdir=infrastructure/terraform/environments/prod import "aws_route53_record.api_acm_validation[\"api.matchcota.tech\"]" "Z00548306NDDNO28UJT9__b721d248fa05a08aae9d096938ad5240.api.matchcota.tech_CNAME"
```

- Import result: **PASS**
- Post-import `terraform state list` included:
  - `aws_apigatewayv2_domain_name.api_custom_domain[0]`
  - `aws_apigatewayv2_api_mapping.api_default[0]`
  - `aws_route53_record.api_acm_validation["api.matchcota.tech"]`

#### Apply executed

```bash
terraform -chdir=infrastructure/terraform/environments/prod apply -input=false -auto-approve
```

- Apply result: **PASS** (`1 added, 2 changed, 0 destroyed`)
- Key reconciliation outcomes:
  - Added `aws_acm_certificate_validation.api_custom_domain[0]` into managed state.
  - Normalized imported Route53 ACM CNAME TTL from `300` to Terraform contract value `60`.
  - Updated API custom domain tag set to match provider default tags.

#### Drift confirmation

```bash
terraform -chdir=infrastructure/terraform/environments/prod plan -input=false
```

- Result: **No changes**

### TLS contract correction (wildcard-safe guidance)

- Updated Terraform edge bootstrap cloud-init contract to remove invalid wildcard issuance via `certbot --nginx`.
- New contract behavior writes DNS-01 wildcard issuance guidance to `/etc/matchcota/tls-bootstrap-dns01.txt` and explicitly instructs:
  - `certbot certonly --manual --preferred-challenges dns ... -d matchcota.tech -d '*.matchcota.tech'`
  - nginx cert path update and reload post-issuance.
- Updated runbook edge TLS section to align with DNS-01 requirement and remove invalid `certbot --nginx` wildcard command.

### Live DNS/TLS readiness rerun

- Timestamp (UTC): 2026-04-09T01:11:37Z
- Commands:

```bash
bash infrastructure/scripts/dns-delegation-check.sh --domain matchcota.tech --wildcard-sample smoke.matchcota.tech --api-host api.matchcota.tech --timeout 120 --interval 15
bash infrastructure/scripts/tls-readiness-check.sh --apex matchcota.tech --wildcard-sample smoke.matchcota.tech --api api.matchcota.tech --timeout 120 --interval 15
```

- DNS result: **PASS**
  - `PASS delegation NS match`
  - `PASS apex A records for matchcota.tech => 18.210.253.176`
  - `PASS wildcard sample A records for smoke.matchcota.tech => 18.210.253.176`
  - `PASS api host A records for api.matchcota.tech => 52.0.251.60, 54.157.182.250`
- TLS result: **PASS**
  - `PASS apex TLS hostname/certificate check (matchcota.tech)`
  - `PASS wildcard TLS hostname/certificate check (smoke.matchcota.tech)`
  - `PASS api TLS hostname/certificate check (api.matchcota.tech)`
  - `SUMMARY apex=PASS wildcard=PASS api=PASS`

### Final reconciliation status

- Terraform state now includes live API domain/mapping/validation resources and is drift-free.
- Edge TLS bootstrap documentation and generated contract now use wildcard-safe DNS-01 instructions.
- DNS and TLS readiness checks remain green after reconciliation.
