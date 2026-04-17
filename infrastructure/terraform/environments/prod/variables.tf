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

variable "frontend_instance_type" {
  description = "EC2 instance type for frontend edge host"
  type        = string
  default     = "t3.micro"
}

variable "frontend_root_volume_gb" {
  description = "Root EBS volume size for frontend edge instance (GiB)"
  type        = number
  default     = 16
}

variable "frontend_allowed_ssh_cidrs" {
  description = "Operator CIDR blocks allowed to access frontend edge SSH port"
  type        = list(string)

  validation {
    condition     = length(var.frontend_allowed_ssh_cidrs) > 0
    error_message = "frontend_allowed_ssh_cidrs must include at least one operator CIDR block."
  }
}

variable "frontend_public_subnet_index" {
  description = "Index of public subnet used for frontend edge placement"
  type        = number
  default     = 0

  validation {
    condition     = var.frontend_public_subnet_index >= 0 && var.frontend_public_subnet_index < length(var.public_subnet_cidrs)
    error_message = "frontend_public_subnet_index must reference a valid index in public_subnet_cidrs."
  }
}

variable "frontend_ssh_user" {
  description = "Default SSH username for frontend edge host"
  type        = string
  default     = "ec2-user"
}

variable "frontend_ami_ssm_parameter" {
  description = "SSM parameter path for frontend edge AMI resolution"
  type        = string
  default     = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
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

variable "lambda_artifact_path" {
  description = "Path to deployment artifact zip consumed by Lambda runtime"
  type        = string
  default     = "../../../../backend/dist/lambda.zip"
}

variable "lambda_artifact_object_key" {
  description = "S3 object key used by Terraform-managed Lambda artifact contract"
  type        = string
  default     = "runtime/lambda.zip"
}

variable "lambda_function_name" {
  description = "Lambda function name for MatchCota backend runtime"
  type        = string
  default     = "matchcota-prod-api"
}

variable "lambda_handler" {
  description = "Lambda handler entrypoint for FastAPI runtime"
  type        = string
  default     = "app.lambda_handler.handler"
}

variable "lambda_runtime" {
  description = "Lambda runtime identifier for backend execution"
  type        = string
  default     = "python3.11"
}

variable "lambda_timeout" {
  description = "Lambda runtime timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda runtime memory allocation in MB"
  type        = number
  default     = 1024
}

variable "lambda_environment_variables" {
  description = "Environment variables injected into Lambda runtime"
  type        = map(string)
  default     = {}
}

variable "lambda_execution_role_arn" {
  description = "Optional explicit execution role ARN for Lambda. Defaults to LabRole in current account."
  type        = string
  default     = ""
}

variable "lambda_subnet_ids" {
  description = "Optional private subnet IDs for Lambda VPC config; defaults to managed private subnets"
  type        = list(string)
  default     = []
}

variable "lambda_security_group_ids" {
  description = "Optional security group IDs for Lambda VPC config; defaults to managed lambda runtime SG"
  type        = list(string)
  default     = []
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

variable "vpc_cidr" {
  description = "CIDR block for the production VPC"
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (exactly two)"
  type        = list(string)
  default     = ["10.42.0.0/24", "10.42.1.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "public_subnet_cidrs must contain exactly two CIDR blocks."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (exactly two)"
  type        = list(string)
  default     = ["10.42.10.0/24", "10.42.11.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "private_subnet_cidrs must contain exactly two CIDR blocks."
  }
}

variable "availability_zones" {
  description = "Availability Zones used for paired public/private subnet layout"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]

  validation {
    condition     = length(var.availability_zones) == 2
    error_message = "availability_zones must contain exactly two AZ values."
  }
}

variable "db_name" {
  description = "PostgreSQL database name for MatchCota runtime"
  type        = string
  default     = "matchcota"
}

variable "db_username" {
  description = "PostgreSQL master username for MatchCota runtime"
  type        = string
  default     = "matchcota_admin"
}

variable "ssm_db_password_parameter_name" {
  description = "SSM parameter name for runtime DB password secret"
  type        = string
  default     = "DB_PASSWORD"
}

variable "ssm_app_secret_key_parameter_name" {
  description = "SSM parameter name for runtime app secret key"
  type        = string
  default     = "APP_SECRET_KEY"
}

variable "ssm_jwt_secret_key_parameter_name" {
  description = "SSM parameter name for runtime JWT secret key"
  type        = string
  default     = "JWT_SECRET_KEY"
}

variable "db_allocated_storage" {
  description = "PostgreSQL allocated storage in GiB"
  type        = number
  default     = 20
}

variable "uploads_bucket_name" {
  description = "Private S3 bucket name for tenant uploads"
  type        = string
  default     = "matchcota-prod-uploads"
}
