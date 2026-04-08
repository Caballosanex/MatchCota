# MatchCota Storage Module - Input Variables

variable "bucket_name" {
  description = "S3 bucket name for static assets"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN for OAC policy (circular dependency workaround via depends_on)"
  type        = string
  default     = ""
}
