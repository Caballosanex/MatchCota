output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.app.public_ip
}

output "private_ip" {
  description = "Private IP address"
  value       = aws_instance.app.private_ip
}

output "apex_fqdn" {
  description = "Apex domain FQDN"
  value       = aws_route53_record.apex.fqdn
}

output "pilot_fqdn" {
  description = "Pilot tenant FQDN"
  value       = aws_route53_record.pilot.fqdn
}
