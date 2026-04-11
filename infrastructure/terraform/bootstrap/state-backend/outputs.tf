output "terraform_state_bucket_name" {
  description = "S3 bucket name to use for prod backend init"
  value       = aws_s3_bucket.tfstate.bucket
}

output "terraform_lock_table_name" {
  description = "DynamoDB table name to use for prod backend locking"
  value       = aws_dynamodb_table.tflock.name
}

output "terraform_backend_region" {
  description = "AWS region used by Terraform remote backend resources"
  value       = var.aws_region
}
