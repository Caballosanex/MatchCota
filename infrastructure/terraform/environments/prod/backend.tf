terraform {
  backend "s3" {
    # Supply via -backend-config at init time (no hardcoded environment names)
    bucket = ""
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    # Supply via -backend-config at init time (no hardcoded environment names)
    dynamodb_table = ""
    encrypt        = true
  }
}
