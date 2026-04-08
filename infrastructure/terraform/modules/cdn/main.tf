# MatchCota CDN Module - CloudFront Distribution with Dual Origins
#
# Creates:
# - CloudFront distribution with ACM certificate for HTTPS
# - S3 origin for frontend static files (default behavior)
# - EC2 origin for backend API (/api/* path pattern)
# - Route 53 ALIAS records for apex and wildcard

locals {
  s3_origin_id  = "S3-matchcota-static"
  ec2_origin_id = "EC2-matchcota-api"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "MatchCota multi-tenant SaaS distribution"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US/Europe only, cheapest

  # Alternate domain names (CNAMEs)
  aliases = [
    var.domain_name,
    "*.${var.domain_name}"
  ]

  # Origin 1: S3 bucket for frontend static files
  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = var.s3_oac_id

    # No custom headers needed for OAC
  }

  # Origin 2: EC2 instance for backend API
  origin {
    domain_name = var.ec2_origin_domain
    origin_id   = local.ec2_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # EC2 receives plain HTTP
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    # Forward Host header to backend for tenant resolution
    custom_header {
      name  = "X-Forwarded-Host"
      value = "$host"
    }
  }

  # Default cache behavior: S3 origin (frontend)
  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 31536000 # 1 year
  }

  # API cache behavior: EC2 origin (backend)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = local.ec2_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = false

    # Forward everything to backend (no caching for API)
    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ACM certificate for HTTPS
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Restrictions (none for global access)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  tags = {
    Name = "MatchCota CDN"
  }
}

# Route 53 records for apex and wildcard
resource "aws_route53_record" "apex_ipv4" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_ipv6" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "wildcard_ipv4" {
  zone_id = var.route53_zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "wildcard_ipv6" {
  zone_id = var.route53_zone_id
  name    = "*.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
