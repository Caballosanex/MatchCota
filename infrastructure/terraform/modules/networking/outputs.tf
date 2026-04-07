output "vpc_id" {
  description = "ID of the VPC (required by Phase 4 for EC2 placement)"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs (required by Phase 4 for EC2 subnet)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs (required by Plan 02-02 for RDS subnet group)"
  value       = aws_subnet.private[*].id
}

output "ec2_security_group_id" {
  description = "ID of the EC2 security group (required by Plan 02-02 for RDS ingress + Phase 3 for CloudFront origin)"
  value       = aws_security_group.ec2.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group (required by Plan 02-02 for RDS instance)"
  value       = aws_security_group.rds.id
}
