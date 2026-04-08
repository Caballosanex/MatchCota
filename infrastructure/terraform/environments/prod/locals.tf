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
}
