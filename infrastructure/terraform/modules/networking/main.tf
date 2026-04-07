# Networking Module - VPC, Subnets, Internet Gateway, Route Tables, Security Groups
#
# Creates the network foundation for MatchCota production environment.
# Public subnets host EC2; private subnets host RDS (no internet route).
# EC2 SG accepts HTTP only from CloudFront managed prefix list.

# --- VPC (NET-01) ---

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "matchcota-vpc"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# --- Internet Gateway (NET-04) ---

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "matchcota-igw"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# --- Public Subnets (NET-02) — one per AZ, used for EC2 ---

resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name        = "matchcota-public-${var.availability_zones[count.index]}"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# --- Private Subnets (NET-03) — one per AZ, used for RDS ---

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = false

  tags = {
    Name        = "matchcota-private-${var.availability_zones[count.index]}"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# --- Public Route Table — routes 0.0.0.0/0 to IGW ---

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "matchcota-public-rt"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- Private Route Table — no internet route (RDS doesn't need internet) ---

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "matchcota-private-rt"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- CloudFront Managed Prefix List Data Source (D-04) ---

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# --- EC2 Security Group (NET-05) ---

resource "aws_security_group" "ec2" {
  name        = "matchcota-ec2-sg"
  description = "Security group for MatchCota EC2 instance"
  vpc_id      = aws_vpc.main.id

  # HTTP from CloudFront IPs only (D-04: AWS managed prefix list)
  ingress {
    description     = "HTTP from CloudFront"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  # SSH from anywhere, key-based auth only (D-05)
  ingress {
    description = "SSH from admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound allowed (app needs to reach RDS, S3, internet for pip installs, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "matchcota-ec2-sg"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# --- RDS Security Group (NET-06) ---

resource "aws_security_group" "rds" {
  name        = "matchcota-rds-sg"
  description = "Security group for MatchCota RDS PostgreSQL instance"
  vpc_id      = aws_vpc.main.id

  # PostgreSQL from EC2 security group only (D-06)
  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  # No internet egress for RDS — private subnet has no IGW route anyway
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
  }

  tags = {
    Name        = "matchcota-rds-sg"
    Project     = "matchcota"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
