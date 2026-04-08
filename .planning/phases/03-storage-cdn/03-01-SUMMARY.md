---
phase: 03-storage-cdn
plan: 01
subsystem: infrastructure
tags: [s3, iam, terraform, aws, storage]

# Dependency graph
requires:
  - phase: 01-dns-ssl-foundation
    provides: Route 53 zone for context (not directly used in Phase 3)
  - phase: 02-core-infrastructure
    provides: VPC for context (not directly used in Phase 3)
provides:
  - S3 bucket for image uploads (matchcota-uploads-788602800812)
  - LabInstanceProfile integration for EC2 S3 access
  - S3 bucket policy granting LabRole full access
affects: [04-compute-deployment]

# Tech tracking
tech-stack:
  added: [aws_s3_bucket, aws_s3_bucket_policy, aws_s3_bucket_public_access_block, aws_iam_role data source]
  patterns: [Use existing AWS Lab LabInstanceProfile instead of custom IAM roles]

key-files:
  created: []
  modified:
    - infrastructure/terraform/modules/storage/main.tf
    - infrastructure/terraform/modules/storage/variables.tf
    - infrastructure/terraform/modules/storage/outputs.tf
    - infrastructure/terraform/environments/prod/main.tf
    - infrastructure/terraform/environments/prod/outputs.tf

key-decisions:
  - "Use existing LabInstanceProfile instead of creating custom IAM role due to AWS Lab IAM restrictions"
  - "Renamed bucket from matchcota-static to matchcota-uploads to reflect no CloudFront static hosting"
  - "Simplified storage module to S3-only (removed CloudFront OAC dependencies)"

patterns-established:
  - "Pattern 1: Use AWS Lab pre-provisioned resources (LabInstanceProfile, LabRole) instead of creating custom IAM resources"
  - "Pattern 2: S3 bucket policy grants access to LabRole for EC2 instance operations"

requirements-completed: [STG-01, STG-02, STG-03]

# Metrics
duration: 5min
completed: 2026-04-08
---

# Phase 3, Plan 1: Storage Infrastructure Summary

**S3 image upload bucket with LabInstanceProfile integration - no CloudFront, simplified for AWS Lab constraints**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-04-08T09:01:00Z
- **Completed:** 2026-04-08T09:06:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- S3 bucket created for image uploads (matchcota-uploads-788602800812)
- Public access fully blocked on S3 bucket
- LabInstanceProfile identified and configured for Phase 4 EC2 attachment
- S3 bucket policy grants LabRole PutObject, GetObject, DeleteObject, ListBucket permissions
- Removed CloudFront/OAC dependencies from storage module

## Task Commits

Each task was committed atomically:

1. **Task 1: Revise Storage Module** - `d2e1ea9` (refactor)
2. **Task 2: Update Production Environment** - `29bff63` (refactor)
3. **Task 3: Deploy + IAM Workaround** - `e965ae3` (fix)

## Files Created/Modified
- `infrastructure/terraform/modules/storage/main.tf` - Replaced CloudFront OAC with LabRole data source and bucket policy
- `infrastructure/terraform/modules/storage/variables.tf` - Removed cloudfront_distribution_arn variable
- `infrastructure/terraform/modules/storage/outputs.tf` - Changed outputs to reference LabInstanceProfile instead of custom role
- `infrastructure/terraform/environments/prod/main.tf` - Removed CDN module, updated storage module bucket name
- `infrastructure/terraform/environments/prod/outputs.tf` - Removed CloudFront outputs, added IAM instance profile output

## Decisions Made

**1. Use existing LabInstanceProfile instead of custom IAM role**
- AWS Lab accounts restrict `iam:CreateRole` permission
- Pre-provisioned LabInstanceProfile exists with LabRole attached
- LabRole has sufficient S3 permissions via VocLabPolicy

**2. Simplified S3 bucket policy to grant LabRole direct access**
- Bucket policy allows LabRole ARN to perform S3 operations
- Actions: PutObject, GetObject, DeleteObject, ListBucket
- Resource: Bucket and all objects within

**3. Renamed bucket from matchcota-static to matchcota-uploads**
- Reflects architectural change: no CloudFront static hosting
- Bucket purpose is now exclusively image uploads (animals, logos)
- Frontend will be served by nginx on EC2 in Phase 4

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] IAM CreateRole permission blocked by AWS Lab**
- **Found during:** Task 3 (Terraform apply)
- **Issue:** AWS Lab account does not allow `iam:CreateRole` - Terraform apply failed with AccessDenied error
- **Fix:** Switched to using existing LabInstanceProfile and LabRole via data source instead of creating custom IAM resources
- **Files modified:** 
  - infrastructure/terraform/modules/storage/main.tf
  - infrastructure/terraform/modules/storage/outputs.tf
- **Verification:** 
  - `aws iam get-instance-profile --instance-profile-name LabInstanceProfile` confirms it exists
  - `aws iam list-attached-role-policies --role-name LabRole` shows policies including S3 access
  - Terraform apply succeeded after changes
- **Committed in:** e965ae3 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Essential workaround for AWS Lab IAM restrictions. Achieves same functional outcome (EC2 can access S3) using pre-provisioned resources instead of custom role.

## Issues Encountered

**1. Initial Terraform apply partially succeeded before IAM error**
- S3 bucket and public access block created successfully
- IAM role creation failed mid-apply
- Resolution: Revised Terraform to use data source for existing LabRole, re-applied successfully

## User Setup Required

None - no external service configuration required.

## Verification Results

All success criteria met:

✅ S3 bucket exists: `matchcota-uploads-788602800812`  
✅ S3 bucket has "Block all public access" enabled  
✅ LabInstanceProfile exists and ready for EC2 attachment  
✅ S3 bucket policy trusts LabRole with full CRUD permissions  
✅ Outputs captured for Phase 4:
  - S3 bucket name: `matchcota-uploads-788602800812`
  - IAM instance profile name: `LabInstanceProfile`

## Next Phase Readiness

**Ready for Phase 4:**
- S3 bucket operational for image uploads
- LabInstanceProfile ready to attach to EC2 instance
- No CloudFront dependencies blocking compute deployment

**Phase 4 will:**
- Create EC2 instance with LabInstanceProfile attached
- Configure nginx to serve frontend and proxy API
- Set up Let's Encrypt SSL on EC2
- Create Route 53 A records pointing to EC2 Elastic IP
- Deploy backend with S3_BUCKET_NAME environment variable

---
*Phase: 03-storage-cdn*
*Completed: 2026-04-08*

## Self-Check: PASSED

✅ All commits exist:
- d2e1ea9: Task 1 - Storage module refactor
- 29bff63: Task 2 - Production environment update
- e965ae3: Task 3 - IAM workaround fix

✅ All key files modified:
- infrastructure/terraform/modules/storage/main.tf
- infrastructure/terraform/modules/storage/variables.tf
- infrastructure/terraform/modules/storage/outputs.tf
- infrastructure/terraform/environments/prod/main.tf
- infrastructure/terraform/environments/prod/outputs.tf

✅ All artifacts captured:
- S3 bucket name: matchcota-uploads-788602800812
- IAM instance profile name: LabInstanceProfile
- Terraform outputs (JSON and text)
- Verification report

✅ All success criteria met:
- S3 bucket exists and is accessible
- Public access fully blocked
- LabInstanceProfile ready for EC2 attachment
- Bucket policy grants LabRole S3 access
