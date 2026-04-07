# MatchCota Production Environment - Phase 1+2: DNS & SSL + Networking & Database
#
# Terraform configuration for AWS infrastructure.
# This file composes modules to build production environment.

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "matchcota"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# DNS Module - Route 53 Hosted Zone
module "dns" {
  source = "../../modules/dns"

  domain_name = var.domain_name
}

# SSL Module - ACM Certificate (MUST be us-east-1 for CloudFront)
module "ssl" {
  source = "../../modules/ssl"

  domain_name = var.domain_name
  zone_id     = module.dns.zone_id

  # SSL module depends on DNS module outputs
  depends_on = [module.dns]
}

# Networking Module - VPC, Subnets, Security Groups
module "networking" {
  source = "../../modules/networking"

  # Uses module defaults: 10.0.0.0/16 VPC, us-east-1a/1b subnets
  # Override here if needed; defaults match CONTEXT.md Claude's discretion decisions
}

# Database Module - RDS PostgreSQL 15
module "database" {
  source = "../../modules/database"

  private_subnet_ids    = module.networking.private_subnet_ids
  rds_security_group_id = module.networking.rds_security_group_id

  db_name     = var.db_name
  db_username = var.db_username

  # Database depends on networking for subnet group and security group
  depends_on = [module.networking]
}
