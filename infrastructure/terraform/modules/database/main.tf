# Database Module - RDS PostgreSQL 15 for MatchCota
#
# Creates RDS PostgreSQL instance in private subnets with a randomly
# generated master password. Designed for the $50 budget constraint:
# db.t3.micro, 20GB gp2, no multi-AZ, no NAT required.

terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Master password (D-07: DB-04)
# special = false avoids characters that break RDS connection strings
resource "random_password" "master" {
  length  = 32
  special = false
}

# RDS subnet group (DB-02 — private subnets only, no public access)
resource "aws_db_subnet_group" "main" {
  name        = "matchcota-db-subnet-group"
  description = "Private subnet group for MatchCota RDS PostgreSQL"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "matchcota-db-subnet-group"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# RDS parameter group (PostgreSQL 15 settings)
resource "aws_db_parameter_group" "main" {
  name        = "matchcota-postgres15"
  family      = "postgres15"
  description = "Parameter group for MatchCota PostgreSQL 15"

  tags = {
    Name        = "matchcota-postgres15"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# RDS instance (DB-01, DB-02, DB-03, DB-04, DB-05)
resource "aws_db_instance" "main" {
  identifier     = "matchcota-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  parameter_group_name   = aws_db_parameter_group.main.name

  publicly_accessible = false
  multi_az            = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Lab/school settings (D-07 context)
  skip_final_snapshot = true
  deletion_protection = false
  apply_immediately   = true

  tags = {
    Name        = "matchcota-db"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
