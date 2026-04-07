# Production Environment Outputs
#
# These values are needed for:
# - Manual NS delegation at DotTech registrar
# - CloudFront distribution configuration (Phase 3)
# - Verification and documentation

output "nameservers" {
  description = "Route 53 nameservers - MUST be configured at DotTech registrar"
  value       = module.dns.name_servers
}

output "zone_id" {
  description = "Route 53 hosted zone ID"
  value       = module.dns.zone_id
}

output "certificate_arn" {
  description = "ACM certificate ARN for CloudFront (Phase 3)"
  value       = module.ssl.certificate_arn
}

output "certificate_status" {
  description = "ACM certificate validation status"
  value       = module.ssl.certificate_status
}

output "next_steps" {
  description = "Manual actions required after terraform apply"
  value       = <<-EOT

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     MANUAL ACTION REQUIRED: NS Delegation
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    1. Log in to DotTech registrar (get.tech)
    2. Navigate to DNS settings for matchcota.tech
    3. Replace nameservers with these Route 53 values:

       ${join("\n       ", module.dns.name_servers)}

    4. Save changes and wait for DNS propagation (15min-48hrs)
    5. Verify with: dig matchcota.tech NS
    6. ACM certificate will validate automatically once NS delegation propagates

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EOT
}
