# MatchCota Storage Module - S3 Bucket with CloudFront Origin Access Control
#
# Creates:
# - S3 bucket for frontend static files and uploaded images
# - Public access block (all public access disabled)
# - CloudFront Origin Access Control (OAC) for secure S3 access
# - S3 bucket policy allowing CloudFront to read objects

resource "aws_s3_bucket" "static" {
  bucket = var.bucket_name

  tags = {
    Name = "MatchCota Static Assets"
  }
}

resource "aws_s3_bucket_public_access_block" "static" {
  bucket = aws_s3_bucket.static.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "matchcota-oac"
  description                       = "OAC for MatchCota S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy to allow CloudFront OAC access
resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = aws_s3_bucket.static.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}
