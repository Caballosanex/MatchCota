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

resource "aws_vpc" "data_plane" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-vpc"
  })
}

resource "aws_internet_gateway" "data_plane" {
  vpc_id = aws_vpc.data_plane.id

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-igw"
  })
}

resource "aws_subnet" "data_plane" {
  for_each = local.subnet_layout

  vpc_id                  = aws_vpc.data_plane.id
  cidr_block              = each.value.cidr_block
  availability_zone       = each.value.az
  map_public_ip_on_launch = each.value.tier == "public"

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-${each.key}"
    Tier = each.value.tier
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.data_plane.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.data_plane.id
  }

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-public-rt"
  })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.data_plane.id

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-private-rt"
  })
}

resource "aws_route_table_association" "public" {
  for_each = {
    for subnet_name, subnet in local.subnet_layout : subnet_name => subnet
    if subnet.tier == "public"
  }

  subnet_id      = aws_subnet.data_plane[each.key].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  for_each = {
    for subnet_name, subnet in local.subnet_layout : subnet_name => subnet
    if subnet.tier == "private"
  }

  subnet_id      = aws_subnet.data_plane[each.key].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route53_record" "api_alias_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.api_custom_domain_name
  type    = "A"

  lifecycle {
    precondition {
      condition     = local.use_api_bootstrap_resources || (var.api_gateway_alias_target_name != "" && var.api_gateway_alias_target_zone_id != "")
      error_message = "api_gateway_alias_target_name and api_gateway_alias_target_zone_id are required when api_custom_domain_bootstrap_enabled=false."
    }
  }

  alias {
    name                   = local.api_alias_dns_name
    zone_id                = local.api_alias_zone_id
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

resource "aws_route53_record" "api_acm_validation" {
  for_each = local.use_api_bootstrap_resources ? {
    for dvo in aws_acm_certificate.api_custom_domain.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = aws_route53_zone.primary.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "api_custom_domain" {
  count = local.use_api_bootstrap_resources ? 1 : 0

  certificate_arn         = aws_acm_certificate.api_custom_domain.arn
  validation_record_fqdns = [for record in aws_route53_record.api_acm_validation : record.fqdn]
}

resource "aws_apigatewayv2_domain_name" "api_custom_domain" {
  count = local.use_api_bootstrap_resources ? 1 : 0

  domain_name = var.api_custom_domain_name

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api_custom_domain[0].certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "api_default" {
  count = local.should_create_api_mapping ? 1 : 0

  api_id      = var.api_gateway_http_api_id
  domain_name = aws_apigatewayv2_domain_name.api_custom_domain[0].domain_name
  stage       = var.api_gateway_stage_name
}

resource "terraform_data" "edge_tls_bootstrap_contract" {
  count = var.edge_tls_bootstrap_enabled ? 1 : 0

  input = {
    base_domain          = var.base_domain
    wildcard_domain      = "*.${var.base_domain}"
    acme_email           = var.edge_tls_acme_email
    certbot_package      = var.edge_tls_certbot_package
    bootstrap_user_data  = local.edge_tls_bootstrap_cloud_init
    renewal_automation   = false
    owner                = "operator"
    tls_strategy         = "letsencrypt-on-ec2-nginx"
    integration_boundary = "api-domain-managed-by-acm-apigateway"
  }

  lifecycle {
    precondition {
      condition     = var.edge_tls_acme_email != ""
      error_message = "edge_tls_acme_email is required when edge_tls_bootstrap_enabled=true."
    }
  }
}
