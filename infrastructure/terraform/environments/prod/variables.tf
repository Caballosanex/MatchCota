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
