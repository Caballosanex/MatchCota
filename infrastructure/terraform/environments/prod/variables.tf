variable "aws_region" {
  description = "AWS region for production infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Optional AWS shared config profile for Academy credentials"
  type        = string
  default     = ""
}

variable "lab_role_name" {
  description = "Required AWS Academy IAM role name"
  type        = string
  default     = "LabRole"
}

variable "lab_instance_profile_name" {
  description = "Required AWS Academy EC2 instance profile name"
  type        = string
  default     = "LabInstanceProfile"
}

variable "terraform_state_bucket" {
  description = "S3 bucket name used for remote Terraform state"
  type        = string
}

variable "terraform_lock_table" {
  description = "DynamoDB table used for Terraform state locking"
  type        = string
}

variable "enabled_services" {
  description = "Optional service toggles used by plan-time guardrails"
  type        = list(string)
  default     = []
}

variable "base_domain" {
  description = "Primary apex domain served by Route53"
  type        = string
  default     = "matchcota.tech"
}

variable "frontend_elastic_ip" {
  description = "Elastic IP address for apex and wildcard frontend A records"
  type        = string
}

variable "api_custom_domain_name" {
  description = "Custom domain name used by API Gateway"
  type        = string
  default     = "api.matchcota.tech"
}

variable "api_gateway_alias_target_name" {
  description = "API Gateway custom domain alias DNS name for Route53 alias record"
  type        = string
}

variable "api_gateway_alias_target_zone_id" {
  description = "Route53 hosted zone ID for the API Gateway alias target"
  type        = string
}
