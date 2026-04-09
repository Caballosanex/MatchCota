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

resource "aws_security_group" "lambda_runtime" {
  name        = "matchcota-prod-lambda-runtime-sg"
  description = "Security group for Lambda runtime ENIs"
  vpc_id      = aws_vpc.data_plane.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-lambda-runtime-sg"
  })
}

resource "aws_security_group" "rds_postgres" {
  name        = "matchcota-prod-rds-postgres-sg"
  description = "Security group for private PostgreSQL"
  vpc_id      = aws_vpc.data_plane.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-rds-postgres-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "rds_postgres_from_lambda" {
  security_group_id            = aws_security_group.rds_postgres.id
  referenced_security_group_id = aws_security_group.lambda_runtime.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Allow PostgreSQL from Lambda runtime SG only"
}

resource "aws_db_subnet_group" "postgres_private" {
  name        = "matchcota-prod-postgres-private"
  description = "Private subnet group for MatchCota PostgreSQL"
  subnet_ids = [
    for subnet_name, subnet in local.subnet_layout : aws_subnet.data_plane[subnet_name].id
    if subnet.tier == "private"
  ]

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-postgres-private-subnet-group"
  })
}

resource "aws_db_instance" "postgres" {
  identifier              = "matchcota-prod-postgres"
  engine                  = "postgres"
  engine_version          = "15"
  instance_class          = "db.t3.micro"
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  allocated_storage       = var.db_allocated_storage
  backup_retention_period = 7
  multi_az                = false
  publicly_accessible     = false
  storage_encrypted       = true
  skip_final_snapshot     = true
  port                    = 5432

  db_subnet_group_name   = aws_db_subnet_group.postgres_private.name
  vpc_security_group_ids = [aws_security_group.rds_postgres.id]

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-postgres"
  })
}

resource "aws_s3_bucket" "uploads" {
  bucket = var.uploads_bucket_name

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-uploads"
  })
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id            = aws_vpc.data_plane.id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowListBucket"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.uploads.arn
      },
      {
        Sid    = "AllowObjectReadWrite"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
    ]
  })

  tags = merge(local.default_tags, {
    Name = "matchcota-prod-s3-gateway-endpoint"
  })
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
