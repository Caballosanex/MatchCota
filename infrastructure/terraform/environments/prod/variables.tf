variable "aws_region" {
  description = "AWS region for resources (must be us-east-1 for ACM+CloudFront)"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use (CRITICAL: must be 'matchcota' to avoid billing personal account)"
  type        = string
  default     = "matchcota"
}

variable "domain_name" {
  description = "Domain name for MatchCota (e.g., matchcota.tech)"
  type        = string
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "matchcota"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "matchcota"
}
