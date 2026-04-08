# MatchCota Compute Module - EC2 with Elastic IP
#
# Creates:
# - EC2 t3.micro instance with Amazon Linux 2023
# - User-data script installing nginx, python3.11, node20, git, certbot
# - Elastic IP for stable public address
# - Route 53 A records for apex and pilot tenant

# Lookup latest Amazon Linux 2023 AMI
data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]
  key_name               = var.key_name
  iam_instance_profile   = var.iam_instance_profile

  user_data = <<-EOF
    #!/bin/bash
    set -e
    
    # Update system
    dnf update -y
    
    # Install core packages
    dnf install -y nginx git postgresql15
    
    # Python 3.11 (AL2023 default)
    dnf install -y python3.11 python3.11-pip python3.11-devel
    
    # Node.js 20 via NodeSource
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
    
    # Certbot with Route 53 plugin
    pip3 install certbot certbot-dns-route53
    
    # Create matchcota user
    useradd -r -s /bin/false matchcota || true
    
    # Create app directory
    mkdir -p /opt/matchcota
    chown matchcota:matchcota /opt/matchcota
    
    # Enable nginx (don't start yet - no config)
    systemctl enable nginx
    
    echo "Bootstrap complete" > /var/log/matchcota-bootstrap.log
  EOF

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "matchcota-app"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "matchcota-app-eip"
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

# Route 53 A records
resource "aws_route53_record" "apex" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

resource "aws_route53_record" "pilot" {
  zone_id = var.zone_id
  name    = "protectora-pilot.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}
