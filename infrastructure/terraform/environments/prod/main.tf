locals {
  default_tags = {
    project     = "matchcota"
    environment = "prod"
    managed_by  = "terraform"
  }
}

resource "terraform_data" "academy_guardrails" {
  input = {
    role_name             = var.lab_role_name
    instance_profile_name = var.lab_instance_profile_name
    enabled_services      = var.enabled_services
  }

  lifecycle {
    precondition {
      condition     = var.lab_role_name == "LabRole"
      error_message = "AWS Academy constraint violation: lab_role_name must be LabRole."
    }

    precondition {
      condition     = var.lab_instance_profile_name == "LabInstanceProfile"
      error_message = "AWS Academy constraint violation: lab_instance_profile_name must be LabInstanceProfile."
    }

    precondition {
      condition = length([
        for service in var.enabled_services : service
        if contains(local.forbidden_services, lower(service))
      ]) == 0
      error_message = "Forbidden service toggle detected in enabled_services. Blocked: cloudfront, cloudwatch, ses, nat_gateway, rds_multi_az."
    }
  }
}
