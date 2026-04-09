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

variable "api_custom_domain_bootstrap_enabled" {
  description = "When true, Terraform creates ACM DNS validation records, API Gateway custom domain, and default mapping"
  type        = bool
  default     = true
}

variable "api_gateway_http_api_id" {
  description = "HTTP API ID used for api.matchcota.tech base path mapping (optional before runtime phase)"
  type        = string
  default     = ""
}

variable "api_gateway_stage_name" {
  description = "HTTP API stage name used for custom domain mapping"
  type        = string
  default     = "$default"
}

variable "api_gateway_alias_target_name" {
  description = "Legacy API alias target DNS name used only when api_custom_domain_bootstrap_enabled=false"
  type        = string
  default     = ""
}

variable "api_gateway_alias_target_zone_id" {
  description = "Legacy API alias target zone ID used only when api_custom_domain_bootstrap_enabled=false"
  type        = string
  default     = ""
}

variable "edge_tls_bootstrap_enabled" {
  description = "When true, Terraform emits edge TLS bootstrap contract artifacts for nginx+certbot"
  type        = bool
  default     = false
}

variable "edge_tls_acme_email" {
  description = "Email used for Let's Encrypt registration on edge nginx bootstrap"
  type        = string
  default     = ""
}

variable "edge_tls_certbot_package" {
  description = "Certbot package install selector used by edge bootstrap script"
  type        = string
  default     = "python3-certbot-nginx"
}
