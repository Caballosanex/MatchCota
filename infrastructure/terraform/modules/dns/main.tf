# DNS Module - Route 53 Hosted Zone for MatchCota
#
# Creates hosted zone for matchcota.tech domain with nameservers
# that will be delegated from DotTech registrar.

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name        = "MatchCota Production DNS"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  comment = "Hosted zone for ${var.domain_name} - multi-tenant SaaS for animal shelter adoptions"
}
