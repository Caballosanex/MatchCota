output "certificate_arn" {
  description = "ARN of the ACM certificate (required for CloudFront)"
  value       = aws_acm_certificate_validation.wildcard.certificate_arn
}

output "certificate_domain" {
  description = "Primary domain name on the certificate"
  value       = aws_acm_certificate.wildcard.domain_name
}

output "certificate_san" {
  description = "Subject Alternative Names on the certificate"
  value       = aws_acm_certificate.wildcard.subject_alternative_names
}

output "certificate_status" {
  description = "Validation status of the certificate"
  value       = aws_acm_certificate.wildcard.status
}
