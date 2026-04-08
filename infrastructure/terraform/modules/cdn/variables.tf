# MatchCota CDN Module - Input Variables

variable "domain_name" {
  description = "Base domain name (matchcota.tech)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be us-east-1)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "S3 bucket regional domain name"
  type        = string
}

variable "s3_oac_id" {
  description = "CloudFront Origin Access Control ID for S3"
  type        = string
}

variable "ec2_origin_domain" {
  description = "EC2 Elastic IP or domain for API origin (placeholder until Phase 4)"
  type        = string
  default     = "127.0.0.1" # Placeholder - replaced in Phase 4
}
