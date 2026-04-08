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
