variable "domain_name" {
  description = "Domain name for the certificate (e.g., matchcota.tech). Wildcard will be *.domain_name"
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone ID for DNS validation records"
  type        = string
}
