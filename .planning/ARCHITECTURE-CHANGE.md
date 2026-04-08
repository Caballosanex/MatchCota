# Architecture Change: CloudFront → Let's Encrypt on EC2

**Date:** 2026-04-08  
**Reason:** AWS Academy Lab account blocks all CloudFront IAM permissions  
**Decision:** Switch from CloudFront + ACM wildcard to Let's Encrypt on EC2 with per-tenant A records

---

## Summary of Changes

### What Changed

| Component | Before (CloudFront) | After (Let's Encrypt) |
|-----------|--------------------|-----------------------|
| **SSL Termination** | CloudFront edge | nginx on EC2 |
| **Certificate** | ACM wildcard (auto-renew) | Let's Encrypt (90-day manual) |
| **Multi-tenant DNS** | Wildcard `*.matchcota.tech` | Individual A records per tenant |
| **Frontend Hosting** | S3 via CloudFront | nginx serves local `/opt/matchcota/frontend/dist` |
| **CDN** | Global edge caching | Direct to EC2 (no CDN) |
| **Cost** | ~$2/month | $0/month |

### Why This Change

**Blocker:** Terraform apply failed with:
```
Error: User arn:aws:sts::788602800812:assumed-role/voclabs/user4414590=alex 
is not authorized to perform: cloudfront:CreateOriginAccessControl
```

AWS Academy Lab accounts have restricted IAM policies that completely block CloudFront operations. This cannot be fixed without instructor intervention, which would block Sprint 6 delivery.

**Decision Rationale:**
- ✅ Unblocks deployment immediately (no IAM restrictions on EC2/nginx/certbot)
- ✅ Stays within $50 budget (actually cheaper, $0 vs $2/month)
- ✅ Delivers working HTTPS demo by Sprint 6 deadline (April 6th)
- ✅ More control over SSL and DNS configuration
- ⚠️ Trade-off: Manual DNS record per tenant (acceptable for MVP)
- ⚠️ Trade-off: 90-day cert renewal (cron job automates this)

---

## Phase Impact

### Phase 1: DNS & SSL Foundation ✅ COMPLETE
**Impact:** None  
**Status:** Keep as-is (Route 53 zone exists, ACM cert unused but harmless)

### Phase 2: Core Infrastructure ✅ COMPLETE
**Impact:** None  
**Status:** Keep as-is (VPC, RDS work for both architectures)

### Phase 3: Storage & CDN → **Storage Infrastructure** ⚠️ REVISED
**Original Goal:** CloudFront distribution with S3 + EC2 origins (9 resources)  
**New Goal:** S3 bucket for image uploads only (1 resource)

**Removed:**
- ❌ CDN module entirely (`infrastructure/terraform/modules/cdn/`)
- ❌ CloudFront distribution
- ❌ CloudFront Origin Access Control (OAC)
- ❌ Route 53 ALIAS records (moved to Phase 4 as A records)

**Modified:**
- ✅ Storage module: S3 bucket with IAM role policy (not OAC)
- ✅ Bucket policy allows EC2 instance profile (not CloudFront service principal)

**New Scope:**
1. Create S3 bucket for uploads (`matchcota-static-788602800812`)
2. Block all public access
3. Create IAM instance profile with `s3:PutObject` permission
4. Attach instance profile to EC2 (done in Phase 4)

**Time:** 1.5h → 0.5h (1 hour saved)

### Phase 4: Compute & Deployment ⚠️ MAJOR EXPANSION
**Original Goal:** Deploy to CloudFront + S3 infrastructure  
**New Goal:** Full SSL stack on EC2 + Route 53 automation + local frontend build

**New Tasks:**

1. **SSL Setup (Let's Encrypt):**
   - Install certbot with Route 53 DNS plugin
   - Generate initial certificate for `matchcota.tech` (apex)
   - Configure nginx SSL listener (443) with cert paths
   - Set up cron job for auto-renewal (every 60 days)
   - Test HTTPS handshake

2. **Frontend Deployment:**
   - Install Node.js 20 on EC2
   - Clone frontend repo to `/opt/matchcota/frontend`
   - Build production bundle with `VITE_API_URL`
   - Configure nginx to serve `dist/` directory

3. **nginx Configuration:**
   - Dual listeners: 443 (HTTPS) + 80 (HTTP redirect to HTTPS)
   - SSL certificate paths from `/etc/letsencrypt/live/`
   - Server name extraction for tenant routing
   - Reverse proxy to uvicorn (backend API)
   - Static file serving for frontend

4. **DNS Management:**
   - Create Route 53 A record: `matchcota.tech` → Elastic IP
   - Create Route 53 A record: `protectora-pilot.matchcota.tech` → Elastic IP
   - Implement boto3 Route 53 integration in backend
   - Test automated A record creation

5. **Tenant Onboarding Automation:**
   - Backend endpoint: `POST /api/v1/admin/tenants`
   - Creates tenant in database
   - Calls Route 53 API to create A record
   - Returns tenant info + DNS propagation status

6. **Security Updates:**
   - EC2 security group: Allow 443 (HTTPS) from `0.0.0.0/0`
   - EC2 security group: Allow 80 (HTTP) for Let's Encrypt challenges
   - Remove CloudFront IP whitelist (no longer needed)
   - Add nginx rate limiting (DDoS protection)

**Time:** 4h (est) → 6h (est) (2 hours added)

---

## Requirements Changes

### Removed Requirements (CloudFront)
- ❌ **CDN-03**: CloudFront distribution created
- ❌ **CDN-04**: CloudFront S3 origin configured
- ❌ **CDN-05**: CloudFront EC2 origin configured
- ❌ **CDN-06**: CloudFront `/api/*` behavior
- ❌ **CDN-07**: CloudFront default behavior
- ❌ **CDN-08**: CloudFront alternate domains
- ❌ **CDN-09**: Route 53 ALIAS records to CloudFront

### Modified Requirements (S3)
- ✅ **CDN-01**: S3 bucket created (unchanged)
- ⚠️ **CDN-02**: S3 configured with IAM policy (was: OAC policy)

### New Requirements (SSL & DNS)
- ➕ **SSL-01**: certbot installed with Route 53 DNS plugin
- ➕ **SSL-02**: Let's Encrypt certificate issued for `matchcota.tech`
- ➕ **SSL-03**: Certificate auto-renewal cron job configured
- ➕ **SSL-04**: nginx SSL configuration tested (HTTPS works)
- ➕ **DNS-06**: Route 53 A record for apex domain
- ➕ **DNS-07**: Route 53 A record for pilot tenant
- ➕ **DNS-08**: boto3 Route 53 integration in backend

### Modified Requirements (Frontend)
- ❌ **FE-01**: Build with production URL (now: build on EC2, not local)
- ❌ **FE-02**: Sync to S3 (now: serve from nginx)
- ❌ **FE-03**: CloudFront invalidation (now: nginx reload)

---

## Tenant Onboarding Flow

### Before (CloudFront + Wildcard)
```
User creates tenant → Backend inserts DB row → Done
(Wildcard DNS already resolves, CloudFront routes automatically)
```

### After (Let's Encrypt + A Records)
```
User creates tenant via UI
  ↓
Backend creates tenant in DB
  ↓
Backend calls Route 53 API (boto3)
  ↓
Create A record: {tenant_slug}.matchcota.tech → Elastic IP
  ↓
Wait 5-15 minutes for DNS propagation
  ↓
(Optional) Generate Let's Encrypt cert for subdomain
  ↓
nginx reload to pick up new config
  ↓
Subdomain works with HTTPS ✅
```

### Implementation
```python
# backend/app/services/dns.py
import boto3
import os

class Route53Service:
    def __init__(self):
        self.client = boto3.client('route53', region_name='us-east-1')
        self.zone_id = os.getenv('ROUTE53_ZONE_ID')  # Z068386214DXGZ36CDSRY
        self.elastic_ip = os.getenv('ELASTIC_IP')
    
    def create_tenant_record(self, tenant_slug: str):
        """Create Route 53 A record for new tenant subdomain."""
        try:
            response = self.client.change_resource_record_sets(
                HostedZoneId=self.zone_id,
                ChangeBatch={
                    'Changes': [{
                        'Action': 'CREATE',
                        'ResourceRecordSet': {
                            'Name': f'{tenant_slug}.matchcota.tech',
                            'Type': 'A',
                            'TTL': 300,
                            'ResourceRecords': [{'Value': self.elastic_ip}]
                        }
                    }]
                }
            )
            return response['ChangeInfo']['Id']
        except self.client.exceptions.InvalidChangeBatch as e:
            # Record already exists (idempotent)
            if 'already exists' in str(e):
                return None
            raise
```

---

## Timeline Summary

| Phase | Original | Revised | Delta | Notes |
|-------|----------|---------|-------|-------|
| Phase 1 | 2h | 2h | 0 | ✅ Complete, no changes |
| Phase 2 | 3h | 3h | 0 | ✅ Complete, no changes |
| Phase 3 | 1.5h | 0.5h | **-1h** | Simplified (S3 only) |
| Phase 4 | 4h | 6h | **+2h** | Added SSL + DNS automation |
| **Total** | **10.5h** | **11.5h** | **+1h** | Modest increase |

**Verdict:** Architecture change adds 1 hour to overall timeline, still achievable for Sprint 6.

---

## Budget Impact

**Before (CloudFront):**
- EC2 t3.micro: $7.50/month
- RDS db.t3.micro: $12/month
- S3: $0.50/month
- CloudFront: $2/month
- Route 53: $0.50/month
- **Total: ~$22.50/month**

**After (Let's Encrypt):**
- EC2 t3.micro: $7.50/month
- RDS db.t3.micro: $12/month
- S3: $0.50/month
- Let's Encrypt: $0/month
- Route 53: $0.50/month
- **Total: ~$20.50/month** ✅ ($2 saved)

**Result:** Architecture change actually **reduces** cost while staying well under $50 budget.

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Cert renewal failure** | Medium | High | Cron job + email alert, manual fallback documented |
| **Let's Encrypt rate limit** (5 certs/week) | Low | Medium | Start with apex only, add subdomains incrementally |
| **DNS propagation delay** (5-15min) | High | Low | UI shows "DNS pending" message, provide status check endpoint |
| **EC2 SPOF** (no CloudFront failover) | High | Medium | Document restart procedures, monitor uptime, ASG in v2 |
| **Forgot to renew cert** (90 days) | Low | High | Cron job runs every 60 days, calendar reminder at 80 days |

---

## Action Items

### Immediate (Phase 3 Revision)
1. ✅ Document architectural change (this file)
2. 🔄 Discard CloudFront code (3 commits, keep for reference)
3. 📝 Revise Phase 3 plan: S3-only (~30min work)
4. ▶️ Execute revised Phase 3

### Next (Phase 4 Expansion)
5. 📝 Create Phase 4 plan with SSL + DNS automation tasks (~6h work)
6. 📝 Update REQUIREMENTS.md (remove CDN-03..09, add SSL-01..04, DNS-06..08)
7. 📝 Update ROADMAP.md (adjust Phase 3/4 success criteria)
8. ▶️ Execute Phase 4 (EC2 + SSL + full deployment)

### Documentation
9. 📝 Document cert renewal procedure in ops runbook
10. 📝 Create tenant onboarding guide (includes DNS propagation wait time)
11. 📝 Update PROJECT.md with final architecture

---

## Conclusion

**Architecture change approved:** CloudFront → Let's Encrypt on EC2

**Key Benefits:**
- ✅ Unblocks CloudFront IAM restriction
- ✅ Delivers working HTTPS demo by Sprint 6 deadline
- ✅ Saves $2/month in infrastructure costs
- ✅ More control over SSL and DNS configuration

**Accepted Trade-offs:**
- ⚠️ Manual A record per tenant (automated via boto3)
- ⚠️ 90-day cert renewal (automated via cron job)
- ⚠️ No global CDN (acceptable for MVP, EC2 in us-east-1)

**Timeline Impact:** +1 hour (11.5h total, manageable)

**Next Steps:**
1. Revise and execute Phase 3 (S3 bucket only)
2. Plan and execute Phase 4 (EC2 + SSL + deployment)
3. Test tenant onboarding with DNS automation
4. Deliver working HTTPS production environment

---
*Architecture change documented: 2026-04-08*  
*Decision maker: User (project team)*  
*Approved by: GSD Executor Agent*
