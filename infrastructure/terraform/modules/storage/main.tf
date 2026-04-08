# MatchCota Storage Module - S3 Bucket for Image Uploads with IAM Instance Profile
#
# Creates:
# - S3 bucket for image uploads (animals, logos)
# - Public access block (all public access disabled)
# - IAM role for EC2 instance with S3 permissions
# - IAM instance profile (attaches role to EC2 in Phase 4)
# - S3 bucket policy allowing IAM role to write objects

resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name

  tags = {
    Name = "MatchCota Image Uploads"
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM role for EC2 instance
resource "aws_iam_role" "ec2" {
  name = "matchcota-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "MatchCota EC2 Role"
  }
}

# IAM policy for S3 access
resource "aws_iam_role_policy" "s3_access" {
  name = "matchcota-s3-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.uploads.arn
      }
    ]
  })
}

# IAM instance profile (attaches role to EC2)
resource "aws_iam_instance_profile" "ec2" {
  name = "matchcota-ec2-profile"
  role = aws_iam_role.ec2.name
}

# Bucket policy (additional layer of security)
resource "aws_s3_bucket_policy" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2InstanceProfile"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ec2.arn
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}
