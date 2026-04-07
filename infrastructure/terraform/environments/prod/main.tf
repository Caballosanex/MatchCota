# MatchCota Production Environment - Phase 1: DNS & SSL
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
