locals {
  forbidden_services = [
    "cloudfront",
    "cloudwatch",
    "ses",
    "nat_gateway",
    "rds_multi_az",
  ]
}
