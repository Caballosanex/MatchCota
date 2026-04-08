provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = {
      project     = "matchcota"
      environment = "prod"
      managed_by  = "terraform"
    }
  }
}
