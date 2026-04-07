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

# Phase 2 outputs: Networking
output "vpc_id" {
  description = "VPC ID (required by Phase 4 for EC2 placement)"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (required by Phase 4 for EC2 subnet)"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs (informational)"
  value       = module.networking.private_subnet_ids
}

output "ec2_security_group_id" {
  description = "EC2 security group ID (required by Phase 3 for CloudFront origin config and Phase 4 for EC2)"
  value       = module.networking.ec2_security_group_id
}

# Phase 2 outputs: Database
output "rds_endpoint" {
  description = "RDS endpoint (host:port) — used to build DATABASE_URL in Phase 4 backend .env"
  value       = module.database.rds_endpoint
}

output "rds_address" {
  description = "RDS hostname only (without port)"
  value       = module.database.rds_address
}

output "db_password" {
  description = "RDS master password. Retrieve with: terraform output -raw db_password"
  value       = module.database.db_password
  sensitive   = true
}

output "db_name" {
  description = "PostgreSQL database name"
  value       = module.database.db_name
}

output "db_username" {
  description = "PostgreSQL master username"
  value       = module.database.db_username
}
