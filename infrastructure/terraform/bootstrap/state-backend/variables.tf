variable "aws_region" {
  description = "AWS region used for bootstrap resources"
  type        = string
  default     = "us-east-1"
}

variable "terraform_state_bucket_name" {
  description = "Deterministic S3 bucket name for Terraform remote state"
  type        = string
  default     = "matchcota-prod-tfstate"
}

variable "terraform_lock_table_name" {
  description = "Deterministic DynamoDB lock table name for Terraform state locking"
  type        = string
  default     = "matchcota-prod-tflock"
}
