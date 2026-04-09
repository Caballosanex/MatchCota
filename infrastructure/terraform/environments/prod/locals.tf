locals {
  forbidden_services = [
    "cloudfront",
    "cloudwatch",
    "ses",
    "nat_gateway",
    "rds_multi_az",
  ]

  apex_record_name     = var.base_domain
  wildcard_record_name = "*.${var.base_domain}"
  apex_wildcard_ttl    = 300

  use_api_bootstrap_resources = var.api_custom_domain_bootstrap_enabled

  should_create_api_mapping = local.use_api_bootstrap_resources && var.api_gateway_http_api_id != ""

  api_alias_dns_name = local.use_api_bootstrap_resources ? aws_apigatewayv2_domain_name.api_custom_domain[0].domain_name_configuration[0].target_domain_name : var.api_gateway_alias_target_name

  api_alias_zone_id = local.use_api_bootstrap_resources ? aws_apigatewayv2_domain_name.api_custom_domain[0].domain_name_configuration[0].hosted_zone_id : var.api_gateway_alias_target_zone_id

  edge_tls_bootstrap_cloud_init = var.edge_tls_bootstrap_enabled ? join("\n", [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    "if [ \"${var.edge_tls_acme_email}\" = \"\" ]; then",
    "  echo 'edge_tls_acme_email must be set when edge_tls_bootstrap_enabled=true' >&2",
    "  exit 1",
    "fi",
    "",
    "if command -v apt-get >/dev/null 2>&1; then",
    "  sudo apt-get update -y",
    "  sudo apt-get install -y nginx ${var.edge_tls_certbot_package}",
    "elif command -v dnf >/dev/null 2>&1; then",
    "  sudo dnf install -y nginx certbot",
    "else",
    "  echo 'Unsupported package manager for edge TLS bootstrap' >&2",
    "  exit 1",
    "fi",
    "",
    "sudo systemctl enable nginx --now",
    "sudo install -d -m 0755 /etc/matchcota",
    "sudo tee /etc/matchcota/tls-bootstrap-dns01.txt >/dev/null <<'GUIDANCE'",
    "MatchCota edge TLS bootstrap (DNS-01 safe)",
    "",
    "Wildcard certificates cannot be issued with certbot --nginx.",
    "Use DNS-01 challenge for apex + wildcard, then point nginx to the issued cert paths.",
    "",
    "Recommended issuance command:",
    "  sudo certbot certonly --manual --preferred-challenges dns --agree-tos --email ${var.edge_tls_acme_email} --manual-public-ip-logging-ok -d ${var.base_domain} -d *.${var.base_domain}",
    "",
    "After issuance:",
    "  1) Configure nginx ssl_certificate and ssl_certificate_key to /etc/letsencrypt/live/${var.base_domain}/",
    "  2) Run: sudo nginx -t && sudo systemctl reload nginx",
    "GUIDANCE",
    "echo 'DNS-01 wildcard TLS guidance saved to /etc/matchcota/tls-bootstrap-dns01.txt'",
    "sudo nginx -t",
    "sudo systemctl reload nginx",
  ]) : ""

  subnet_layout = {
    public_a = {
      cidr_block = var.public_subnet_cidrs[0]
      tier       = "public"
      az         = var.availability_zones[0]
    }
    public_b = {
      cidr_block = var.public_subnet_cidrs[1]
      tier       = "public"
      az         = var.availability_zones[1]
    }
    private_a = {
      cidr_block = var.private_subnet_cidrs[0]
      tier       = "private"
      az         = var.availability_zones[0]
    }
    private_b = {
      cidr_block = var.private_subnet_cidrs[1]
      tier       = "private"
      az         = var.availability_zones[1]
    }
  }
}
