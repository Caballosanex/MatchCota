# Phase 3, Plan 1 (REVISED): Storage Infrastructure

**Phase:** 3 - Storage Infrastructure  
**Plan:** 03-01-REVISED  
**Created:** 2026-04-08 (replaces original CloudFront plan due to IAM restrictions)  
**Status:** Ready to execute  
**Wave:** Single wave (3 sequential tasks, ~30 minutes total)

## Context

**ARCHITECTURE CHANGE:** Original Phase 3 planned CloudFront + S3 static hosting + OAC. AWS Academy Lab accounts block all CloudFront IAM permissions, making this impossible. 

**New Architecture:** Let's Encrypt SSL on EC2 with per-tenant Route 53 A records. Phase 3 now focuses ONLY on S3 bucket for image uploads (no CDN, no static hosting).

**Prerequisites (from previous phases):**
- ✅ Route 53 zone: `Z068386214DXGZ36CDSRY`
- ✅ VPC: `vpc-04c45afa110b08c25`
- ✅ EC2 security group: `sg-0f67d468d311e312c` (Phase 4 will use this)

**What this plan delivers:**
1. S3 bucket for image uploads (animals photos, shelter logos)
2. IAM instance profile allowing EC2 to write to S3
3. S3 bucket policy granting instance profile PutObject permission
4. Block all public access to S3 (secure by default)

**What this plan does NOT deliver:**
- ❌ CloudFront distribution (blocked by IAM, removed from scope)
- ❌ S3 static site hosting (frontend served by nginx on EC2 in Phase 4)
- ❌ Origin Access Control (not needed without CloudFront)
- ❌ Route 53 ALIAS records (changed to A records in Phase 4)

## Requirements Coverage

This plan satisfies Phase 3 storage requirements:

- [ ] **STG-01**: S3 bucket created for image uploads
- [ ] **STG-02**: S3 bucket configured with block public access + IAM instance profile policy
- [ ] **STG-03**: IAM instance profile allows EC2 to write uploads to S3 bucket

**Total:** 3 requirements (down from 9 in original CloudFront plan)

## Success Criteria

At the end of this plan, the following MUST be true:

1. ✅ S3 bucket exists with unique name (e.g., `matchcota-uploads-788602800812`)
2. ✅ S3 bucket has "Block all public access" enabled
3. ✅ IAM instance profile `matchcota-ec2-profile` created
4. ✅ IAM role policy allows `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on bucket
5. ✅ S3 bucket policy trusts IAM instance profile
6. ✅ S3 bucket ARN and name captured for Phase 4 backend .env configuration

**Verification commands:**
```bash
# Check S3 bucket exists
aws s3 ls s3://matchcota-uploads-788602800812/

# Check public access blocked
aws s3api get-public-access-block --bucket matchcota-uploads-788602800812

# Check IAM instance profile exists
aws iam get-instance-profile --instance-profile-name matchcota-ec2-profile

# Verify role attached
aws iam list-attached-role-policies --role-name matchcota-ec2-role
```

## Tasks

### Task 1: Revise Storage Module (Remove CloudFront Dependencies)

**Objective:** Update storage module to use IAM instance profile instead of CloudFront OAC

**Deliverables:**
- Updated `infrastructure/terraform/modules/storage/main.tf`
- Updated `infrastructure/terraform/modules/storage/variables.tf`
- Updated `infrastructure/terraform/modules/storage/outputs.tf`

**Implementation:**

Update `main.tf` to remove OAC and add IAM instance profile:

```hcl
# MatchCota Storage Module - S3 Bucket for Image Uploads with IAM Instance Profile
#
# Creates:
# - S3 bucket for image uploads (animals, logos)
# - Public access block (all public access disabled)
# - IAM role for EC2 instance with S3 permissions
# - IAM instance profile (attaches role to EC2 in Phase 4)
# - S3 bucket policy allowing IAM role to write objects

resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name

  tags = {
    Name = "MatchCota Image Uploads"
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM role for EC2 instance
resource "aws_iam_role" "ec2" {
  name = "matchcota-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "MatchCota EC2 Role"
  }
}

# IAM policy for S3 access
resource "aws_iam_role_policy" "s3_access" {
  name = "matchcota-s3-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.uploads.arn
      }
    ]
  })
}

# IAM instance profile (attaches role to EC2)
resource "aws_iam_instance_profile" "ec2" {
  name = "matchcota-ec2-profile"
  role = aws_iam_role.ec2.name
}

# Bucket policy (additional layer of security)
resource "aws_s3_bucket_policy" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2InstanceProfile"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ec2.arn
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}
```

Update `variables.tf`:

```hcl
# MatchCota Storage Module - Input Variables

variable "bucket_name" {
  description = "S3 bucket name for image uploads"
  type        = string
}
```

Update `outputs.tf`:

```hcl
# MatchCota Storage Module - Outputs

output "bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.uploads.bucket
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.uploads.arn
}

output "bucket_domain_name" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}

output "instance_profile_name" {
  description = "IAM instance profile name (attach to EC2 in Phase 4)"
  value       = aws_iam_instance_profile.ec2.name
}

output "instance_profile_arn" {
  description = "IAM instance profile ARN"
  value       = aws_iam_instance_profile.ec2.arn
}

output "iam_role_arn" {
  description = "IAM role ARN for EC2"
  value       = aws_iam_role.ec2.arn
}
```

**Acceptance criteria:**
- Module creates S3 bucket with predictable name
- Bucket has all public access blocked
- IAM instance profile created with S3 write permissions
- Outputs expose instance profile name for Phase 4 EC2 attachment

---

### Task 2: Update Production Environment (Remove CDN Module)

**Objective:** Remove CDN module references and update storage module configuration

**Deliverables:**
- Updated `infrastructure/terraform/environments/prod/main.tf`
- Updated `infrastructure/terraform/environments/prod/outputs.tf`

**Implementation:**

Update `main.tf` to remove CDN module and update storage module:

```hcl
# Remove the entire CDN module block

# Update Storage Module call:
module "storage" {
  source = "../../modules/storage"

  bucket_name = "matchcota-uploads-${data.aws_caller_identity.current.account_id}"
}
```

Update `outputs.tf` to remove CloudFront outputs and add IAM outputs:

```hcl
# Remove these outputs:
# - cloudfront_distribution_id
# - cloudfront_distribution_arn
# - cloudfront_domain_name
# - site_url

# Add Phase 3 outputs:
output "s3_bucket_name" {
  description = "S3 bucket name for image uploads"
  value       = module.storage.bucket_name
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = module.storage.bucket_arn
}

output "iam_instance_profile_name" {
  description = "IAM instance profile name (attach to EC2 in Phase 4)"
  value       = module.storage.instance_profile_name
}
```

**Acceptance criteria:**
- CDN module completely removed from main.tf
- Storage module configured with correct bucket name
- Outputs expose S3 bucket and IAM instance profile details

---

### Task 3: Deploy Revised Infrastructure and Verify

**Objective:** Apply Terraform changes and verify S3 + IAM setup

**Commands:**

```bash
cd infrastructure/terraform/environments/prod

# Re-initialize (storage module changed)
terraform init -upgrade

# Plan to preview changes
terraform plan -out=phase3-revised.tfplan

# Apply Phase 3 revised infrastructure
terraform apply phase3-revised.tfplan

# Capture outputs
terraform output > ../../../../.planning/phases/03-storage-cdn/artifacts/infrastructure-outputs-revised.txt
terraform output -json > ../../../../.planning/phases/03-storage-cdn/artifacts/infrastructure-outputs-revised.json

# Save critical values
terraform output -raw s3_bucket_name > ../../../../.planning/phases/03-storage-cdn/artifacts/s3-bucket-name.txt
terraform output -raw iam_instance_profile_name > ../../../../.planning/phases/03-storage-cdn/artifacts/iam-instance-profile-name.txt
```

**Verification:**

```bash
# Test S3 bucket exists
aws s3 ls s3://matchcota-uploads-788602800812/
# Should succeed (empty bucket)

# Check public access blocked
aws s3api get-public-access-block --bucket matchcota-uploads-788602800812
# Should show all blocks enabled

# Check IAM instance profile
aws iam get-instance-profile --instance-profile-name matchcota-ec2-profile
# Should return profile details with role attached

# List role policies
aws iam list-attached-role-policies --role-name matchcota-ec2-role
# Should show s3-access policy

# Verify role policy content
aws iam get-role-policy --role-name matchcota-ec2-role --policy-name matchcota-s3-access
# Should show PutObject, GetObject, DeleteObject permissions
```

**Deliverables:**
- `artifacts/infrastructure-outputs-revised.txt` - All Terraform outputs
- `artifacts/infrastructure-outputs-revised.json` - JSON format for parsing
- `artifacts/s3-bucket-name.txt` - For Phase 4 backend .env
- `artifacts/iam-instance-profile-name.txt` - For Phase 4 EC2 creation
- `artifacts/verification-report-revised.txt` - Manual verification results

**Acceptance criteria:**
- Terraform apply completes successfully (~1-2 minutes, no CloudFront wait)
- S3 bucket exists and public access is blocked
- IAM instance profile exists with S3 permissions
- Outputs captured for Phase 4 reference

---

## Dependencies

**Input dependencies (from Phase 1 & 2):**
- Route 53 zone ID (Phase 1): `Z068386214DXGZ36CDSRY` (not used in this phase, needed for Phase 4)
- VPC ID (Phase 2): `vpc-04c45afa110b08c25` (not used in this phase, needed for Phase 4)

**Output dependencies (for Phase 4):**
- S3 bucket name: For backend S3_BUCKET_NAME environment variable
- S3 bucket ARN: For verification in Phase 4
- IAM instance profile name: Attach to EC2 instance during creation
- IAM role ARN: For documentation and troubleshooting

**Blocking relationships:**
- This phase does NOT block on Phase 1 ACM certificate (not needed without CloudFront)
- Phase 4 CANNOT start until this phase completes (needs S3 bucket and IAM profile)

## Files Changed

**Modified files:**
1. `infrastructure/terraform/modules/storage/main.tf` (~90 lines, removed OAC, added IAM)
2. `infrastructure/terraform/modules/storage/variables.tf` (~10 lines, simplified)
3. `infrastructure/terraform/modules/storage/outputs.tf` (~30 lines, added IAM outputs)
4. `infrastructure/terraform/environments/prod/main.tf` (-25 lines, removed CDN module)
5. `infrastructure/terraform/environments/prod/outputs.tf` (-25 lines CDN, +15 lines storage/IAM)

**Deleted directory:**
6. `infrastructure/terraform/modules/cdn/` (entire module, keep for reference but won't deploy)

**Artifact files (generated):**
7. `.planning/phases/03-storage-cdn/artifacts/infrastructure-outputs-revised.txt`
8. `.planning/phases/03-storage-cdn/artifacts/infrastructure-outputs-revised.json`
9. `.planning/phases/03-storage-cdn/artifacts/s3-bucket-name.txt`
10. `.planning/phases/03-storage-cdn/artifacts/iam-instance-profile-name.txt`
11. `.planning/phases/03-storage-cdn/artifacts/verification-report-revised.txt`

**Total:** 5 modified modules + 5 artifact files = **10 files**

## Estimated Time

| Task | Time | Justification |
|------|------|---------------|
| Task 1: Revise storage module | 10min | Remove OAC, add IAM (straightforward) |
| Task 2: Update prod environment | 5min | Remove CDN references |
| Task 3: Deploy + verify | 15min | Terraform apply fast (no CloudFront wait), verification |
| **Total** | **30min** | Down from 85min in original CloudFront plan |

**Time saved:** 55 minutes (CloudFront deployment wait eliminated)

## Rollback Plan

If Phase 3 deployment fails:

1. **Terraform errors during apply:**
   - Review error messages (likely IAM policy syntax or bucket naming)
   - Fix errors in modules
   - Re-run `terraform apply`

2. **IAM permissions issues:**
   - Verify LabRole has `iam:CreateRole`, `iam:CreateInstanceProfile` permissions
   - If blocked, use existing `LabInstanceProfile` instead (check if exists)

3. **S3 bucket name conflict:**
   - Bucket names are globally unique across ALL AWS accounts
   - If conflict, change suffix in main.tf (e.g., add random string)

4. **Need to destroy and restart:**
   ```bash
   cd infrastructure/terraform/environments/prod
   terraform destroy -target=module.storage
   terraform apply
   ```

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| IAM role creation blocked | Low | Medium | Use existing LabInstanceProfile if available |
| S3 bucket name taken | Very Low | Low | Account ID suffix makes collision unlikely |
| Terraform state corruption | Very Low | High | Backup state file before apply |

## Notes

**Why this is simpler than CloudFront plan:**
- No CloudFront distribution (15-20min deployment eliminated)
- No OAC (Origin Access Control) setup
- No Route 53 ALIAS records (moved to Phase 4 as A records)
- No circular dependencies between S3 and CloudFront
- IAM instance profile is straightforward (no service principal complexity)

**Phase 4 will handle:**
- EC2 instance creation with IAM instance profile attached
- Let's Encrypt SSL setup on EC2
- nginx configuration for SSL and frontend serving
- Route 53 A record creation (apex + pilot tenant)
- boto3 Route 53 integration for tenant onboarding

**Cost impact:**
- Phase 3 adds: S3 storage (~$0.50/month), IAM role (free)
- Phase 3 removes: CloudFront (~$2/month)
- **Net savings: $1.50/month**

---

## Checklist

### Pre-execution
- [x] Phase 1 DNS complete (zone exists)
- [x] Phase 2 networking complete (VPC exists)
- [x] AWS CLI profile `matchcota` active
- [ ] Working directory: `infrastructure/terraform/environments/prod`

### Execution
- [ ] Task 1: Storage module revised (IAM added, OAC removed)
- [ ] Task 2: Production environment updated (CDN module removed)
- [ ] Task 3: `terraform init -upgrade` successful
- [ ] Task 3: `terraform plan` shows expected resources (~10-15 resources)
- [ ] Task 3: `terraform apply` successful
- [ ] Task 3: Outputs captured to artifacts

### Verification
- [ ] S3 bucket exists and is accessible
- [ ] S3 public access blocked confirmed
- [ ] IAM instance profile exists
- [ ] IAM role policy grants S3 permissions
- [ ] S3 bucket name captured for Phase 4
- [ ] IAM instance profile name captured for Phase 4

### Documentation
- [ ] Outputs saved to artifacts/
- [ ] Verification report written
- [ ] STATE.md updated with Phase 3 completion
- [ ] ROADMAP.md updated with timestamp

---

**End of Revised Plan 03-01**
