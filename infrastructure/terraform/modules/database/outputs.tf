output "rds_endpoint" {
  description = "RDS instance endpoint (host:port) for DATABASE_URL in backend .env"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS instance hostname only (without port) for direct connection"
  value       = aws_db_instance.main.address
}

output "db_password" {
  description = "Master password for RDS. Retrieve with: terraform output -raw db_password"
  value       = random_password.master.result
  sensitive   = true
}

output "db_name" {
  description = "Database name configured on the RDS instance"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "Master username configured on the RDS instance"
  value       = aws_db_instance.main.username
}
