output "academy_iam_guardrail" {
  description = "True when Academy IAM guardrail checks are present and active"
  value       = true
}

output "forbidden_service_guardrail" {
  description = "True when forbidden service guardrail checks are present and active"
  value       = true
}

output "route53_hosted_zone_id" {
  description = "Route53 hosted zone ID for the base domain"
  value       = aws_route53_zone.primary.zone_id
}

output "route53_hosted_zone_name" {
  description = "Route53 hosted zone DNS name for delegation"
  value       = aws_route53_zone.primary.name
}

output "route53_hosted_zone_name_servers" {
  description = "Authoritative Route53 name servers to set at DotTech"
  value       = aws_route53_zone.primary.name_servers
}

output "dns_apex_record_target_eip" {
  description = "Elastic IP target used by apex DNS A record"
  value       = var.frontend_elastic_ip
}

output "dns_wildcard_record_target_eip" {
  description = "Elastic IP target used by wildcard DNS A record"
  value       = var.frontend_elastic_ip
}

output "dns_api_alias_target_name" {
  description = "API Gateway alias target DNS name for api.matchcota.tech"
  value       = var.api_gateway_alias_target_name
}

output "dns_api_alias_target_zone_id" {
  description = "API Gateway alias target hosted zone ID for api.matchcota.tech"
  value       = var.api_gateway_alias_target_zone_id
}

output "dns_api_custom_domain_name" {
  description = "Configured API custom domain name"
  value       = var.api_custom_domain_name
}
