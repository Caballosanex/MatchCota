variable "domain_name" {
  description = "Domain name for the hosted zone (e.g., matchcota.tech)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid DNS name"
  }
}
