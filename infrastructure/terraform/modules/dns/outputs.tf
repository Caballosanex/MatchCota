output "zone_id" {
  description = "Route 53 hosted zone ID (required for ACM validation records)"
  value       = aws_route53_zone.main.zone_id
}

output "zone_name" {
  description = "Domain name of the hosted zone"
  value       = aws_route53_zone.main.name
}

output "name_servers" {
  description = "List of name servers for NS delegation at DotTech registrar"
  value       = aws_route53_zone.main.name_servers
}

output "zone_arn" {
  description = "ARN of the hosted zone"
  value       = aws_route53_zone.main.arn
}
