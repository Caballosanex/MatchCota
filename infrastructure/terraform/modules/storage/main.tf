# MatchCota Storage Module - S3 Bucket for Image Uploads with Existing IAM Instance Profile
#
# Creates:
# - S3 bucket for image uploads (animals, logos)
# - Public access block (all public access disabled)
# - S3 bucket policy allowing LabRole to write objects
#
# NOTE: Uses existing LabInstanceProfile instead of creating new IAM role
# AWS Lab accounts restrict iam:CreateRole - must use pre-provisioned LabInstanceProfile

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

# Use existing LabRole ARN for bucket policy
# LabInstanceProfile is pre-provisioned in AWS Academy Lab accounts
data "aws_iam_role" "lab" {
  name = "LabRole"
}

# Bucket policy allowing LabRole to access S3
resource "aws_s3_bucket_policy" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLabRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = data.aws_iam_role.lab.arn
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.uploads.arn}",
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      }
    ]
  })
}
