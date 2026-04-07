variable "private_subnet_ids" {
  description = "List of private subnet IDs for the RDS subnet group (from networking module)"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "ID of the RDS security group (from networking module)"
  type        = string
}

variable "db_name" {
  description = "Name of the PostgreSQL database to create"
  type        = string
  default     = "matchcota"
}

variable "db_username" {
  description = "Master username for the PostgreSQL database"
  type        = string
  default     = "matchcota"
}
