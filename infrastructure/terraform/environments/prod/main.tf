locals {
  default_tags = {
    project     = "matchcota"
    environment = "prod"
    managed_by  = "terraform"
  }
}

resource "terraform_data" "academy_guardrails" {
  input = {
    role_name             = var.lab_role_name
    instance_profile_name = var.lab_instance_profile_name
    enabled_services      = var.enabled_services
  }

  lifecycle {
    precondition {
      condition     = var.lab_role_name == "LabRole"
      error_message = "AWS Academy constraint violation: lab_role_name must be LabRole."
    }

    precondition {
      condition     = var.lab_instance_profile_name == "LabInstanceProfile"
      error_message = "AWS Academy constraint violation: lab_instance_profile_name must be LabInstanceProfile."
    }

    precondition {
      condition = length([
        for service in var.enabled_services : service
        if contains(local.forbidden_services, lower(service))
      ]) == 0
      error_message = "Forbidden service toggle detected in enabled_services. Blocked: cloudfront, cloudwatch, ses, nat_gateway, rds_multi_az."
    }
  }
}

resource "aws_route53_zone" "primary" {
  name = var.base_domain
}

resource "aws_route53_record" "apex_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.apex_record_name
  type    = "A"
  ttl     = local.apex_wildcard_ttl
  records = [var.frontend_elastic_ip]
}

resource "aws_route53_record" "wildcard_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.wildcard_record_name
  type    = "A"
  ttl     = local.apex_wildcard_ttl
  records = [var.frontend_elastic_ip]
}

resource "aws_route53_record" "api_alias_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.api_custom_domain_name
  type    = "A"

  alias {
    name                   = var.api_gateway_alias_target_name
    zone_id                = var.api_gateway_alias_target_zone_id
    evaluate_target_health = false
  }
}

resource "aws_acm_certificate" "api_custom_domain" {
  domain_name       = var.api_custom_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
