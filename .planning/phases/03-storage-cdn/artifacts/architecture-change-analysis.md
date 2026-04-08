# Let's Encrypt Architecture Impact Analysis

## Architectural Change Summary

**FROM:** CloudFront terminates SSL with ACM wildcard cert → EC2 receives HTTP
**TO:** EC2 terminates SSL with Let's Encrypt cert → nginx handles HTTPS directly

## Key Differences

| Aspect | CloudFront (Original) | Let's Encrypt (New) |
|--------|----------------------|---------------------|
| **SSL Termination** | CloudFront edge locations | nginx on EC2 |
| **Certificate Source** | ACM (AWS-managed, free) | Let's Encrypt (certbot, free) |
| **Wildcard Support** | ✅ `*.matchcota.tech` | ❌ Individual certs per subdomain |
| **Cert Renewal** | Automatic (AWS) | Manual/scripted every 90 days |
| **Multi-Tenant DNS** | Automatic via wildcard | Manual Route 53 A record per tenant |
| **CDN Caching** | Global edge caching | None (direct to EC2) |
| **Origin Protection** | CloudFront IPs only | Public internet (rate limiting needed) |
| **S3 Frontend** | CloudFront → S3 (OAC) | nginx serves from local disk |
| **Cost** | ~$2/month | $0 |

## Phase-by-Phase Impact

### Phase 1: DNS & SSL Foundation
**Status:** ✅ COMPLETE (no changes needed)
**Impact:** None - Route 53 zone and ACM cert already exist
**Note:** ACM cert becomes unused but harmless (keep for potential future ALB)

### Phase 3: Storage & CDN
**Status:** ⚠️ MAJOR REVISION NEEDED
**Original Goal:** CloudFront distribution with S3 + EC2 origins
**New Goal:** S3 bucket for uploads only (no static site hosting)

**Changes Required:**
1. **Remove entirely:**
   - CDN module (`infrastructure/terraform/modules/cdn/`)
   - CloudFront distribution
   - Route 53 ALIAS records (replaced by A records in Phase 4)
   - S3 OAC (Origin Access Control)

2. **Keep with modifications:**
   - Storage module: S3 bucket for image uploads only
   - Remove OAC, change policy to allow EC2 IAM role instead

3. **New scope:**
   - S3 bucket with IAM role policy (not public, not CloudFront)
   - EC2 writes uploads via boto3 (S3 SDK)
   - No frontend static hosting (nginx serves from `/opt/matchcota/frontend/dist`)

**Requirements Impact:**
- ❌ CDN-03, CDN-04, CDN-05, CDN-06, CDN-07, CDN-08, CDN-09 (CloudFront requirements) → REMOVED
- ✅ CDN-01, CDN-02 (S3 bucket) → MODIFIED (IAM policy instead of OAC)

**New Phase 3 Name:** "Storage Infrastructure" (not "Storage & CDN")

### Phase 4: Compute & Deployment
**Status:** ⚠️ MAJOR ADDITIONS NEEDED
**Original Goal:** Deploy to existing CloudFront + S3 infrastructure
**New Goal:** Full SSL stack on EC2 + tenant DNS automation

**New Tasks Required:**

1. **SSL Certificate Management:**
   - Install certbot (Let's Encrypt client)
   - Configure Route 53 DNS plugin for certbot
   - Generate initial cert for `matchcota.tech` (apex only)
   - Set up auto-renewal cron job (every 60 days)
   - nginx SSL configuration (443 listener, cert paths)

2. **Frontend Deployment:**
   - Clone frontend code to EC2 (`/opt/matchcota/frontend`)
   - Build frontend on EC2 (Node.js installed)
   - nginx serves from `/opt/matchcota/frontend/dist`
   - No S3 sync, no CloudFront invalidation

3. **nginx Configuration:**
   - Dual listeners: 443 (HTTPS) + 80 (HTTP redirect)
   - SSL cert paths: `/etc/letsencrypt/live/matchcota.tech/`
   - Server name extraction for multi-tenancy
   - Reverse proxy to uvicorn (backend)
   - Static file serving for frontend

4. **Tenant Onboarding Automation:**
   - Backend API endpoint: `POST /api/v1/admin/tenants` 
   - Creates tenant in DB
   - Creates Route 53 A record pointing to Elastic IP
   - Generates Let's Encrypt cert for new subdomain (optional, can defer)
   - Reloads nginx

5. **DNS Management:**
   - Route 53 A record for apex: `matchcota.tech` → Elastic IP
   - Initial A record for pilot: `protectora-pilot.matchcota.tech` → Elastic IP
   - boto3 integration for dynamic A record creation

6. **Security Hardening:**
   - EC2 security group: Allow 443 (HTTPS) from 0.0.0.0/0
   - EC2 security group: Allow 80 (HTTP) for Let's Encrypt challenges
   - Remove CloudFront IP whitelist (no longer needed)
   - Rate limiting in nginx (prevent abuse)

**Requirements Impact:**
- ✅ EC2-01 through EC2-05 → UNCHANGED
- ✅ BE-01 through BE-08 → UNCHANGED
- ⚠️ BE-09 (nginx config) → MAJOR CHANGES (SSL, dual listeners, static serving)
- ✅ BE-10, BE-11, BE-12 → UNCHANGED
- ❌ FE-01, FE-02, FE-03 (S3 deployment) → REPLACED with local build on EC2
- ✅ DATA-01, DATA-02, DATA-03 → UNCHANGED
- ⚠️ VER-01 through VER-07 → URLs change from CloudFront to Elastic IP DNS

**New Requirements to Add:**
- **SSL-01**: certbot installed with Route 53 DNS plugin
- **SSL-02**: Initial Let's Encrypt certificate for `matchcota.tech` issued
- **SSL-03**: Certificate auto-renewal cron job configured
- **SSL-04**: nginx SSL configuration tested (HTTPS handshake succeeds)
- **DNS-06**: Route 53 A record created for apex domain
- **DNS-07**: Route 53 A record created for pilot tenant subdomain
- **DNS-08**: boto3 Route 53 integration in backend for tenant onboarding

## Tenant Onboarding Flow

**Original (CloudFront + Wildcard):**
```
1. Admin creates tenant via UI → POST /api/v1/admin/tenants
2. Backend creates tenant in DB
3. Done - wildcard DNS already works, CloudFront routes to backend
```

**New (Let's Encrypt + Individual A Records):**
```
1. Admin creates tenant via UI → POST /api/v1/admin/tenants
2. Backend creates tenant in DB
3. Backend calls Route 53 API (boto3) to create A record:
   - Name: `{tenant_slug}.matchcota.tech`
   - Type: A
   - Value: {ec2_elastic_ip}
   - TTL: 300 (5 minutes)
4. DNS propagates (5-15 minutes)
5. (Optional) Backend calls certbot to generate SSL cert for subdomain
6. nginx reload to pick up new cert
7. Done - subdomain now works with HTTPS
```

**Implementation:**
```python
# backend/app/services/dns.py
import boto3

class Route53Service:
    def __init__(self):
        self.client = boto3.client('route53', region_name='us-east-1')
        self.zone_id = 'Z068386214DXGZ36CDSRY'
        self.elastic_ip = os.getenv('ELASTIC_IP')
    
    def create_tenant_record(self, tenant_slug: str):
        """Create Route 53 A record for new tenant subdomain."""
        self.client.change_resource_record_sets(
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
```

## Timeline Impact

| Phase | Original Time | New Time | Delta | Notes |
|-------|--------------|----------|-------|-------|
| Phase 1 | 2h | 2h | 0 | ✅ Complete, no changes |
| Phase 2 | 3h | 3h | 0 | ✅ Complete, no changes |
| Phase 3 | 1.5h | 0.5h | **-1h** | Simplified: S3 bucket only, no CloudFront |
| Phase 4 | 4h (est) | 6h (est) | **+2h** | Added: certbot, SSL config, frontend build, Route 53 automation |
| **Total** | **10.5h** | **11.5h** | **+1h** | Modest increase, manageable |

## Complexity Impact

**Reduced Complexity:**
- ❌ No CloudFront distribution (15-20min deployment wait)
- ❌ No S3 static site hosting configuration
- ❌ No CloudFront cache invalidation
- ❌ No OAC (Origin Access Control) setup

**Added Complexity:**
- ➕ Let's Encrypt cert generation and renewal
- ➕ nginx SSL configuration (cert paths, HTTPS listener)
- ➕ Route 53 API integration (boto3) for tenant onboarding
- ➕ Manual DNS record creation per tenant
- ➕ Frontend build on EC2 (Node.js installation)

**Net Complexity:** Slightly higher, but more control and no AWS service restrictions

## New Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Let's Encrypt rate limits (5 certs/week per domain) | Low | Medium | Start with apex only, add subdomains incrementally |
| Certificate renewal failure | Medium | High | Cron job + alerting, manual fallback documented |
| EC2 becomes SPOF (no CloudFront failover) | High | Medium | Document restart procedures, consider ASG in v2 |
| DNS propagation delay (5-15min) | High | Low | Set expectations in UI, provide DNS status check |
| No CDN caching (slower for distant users) | High | Low | Acceptable for MVP, EC2 in us-east-1 serves most traffic |
| Forgot to renew cert (90 day expiry) | Low | High | Cron job, calendar reminder, extend to 120 days for buffer |

## Revised Success Criteria

**Phase 3 (Storage Infrastructure):**
1. ✅ S3 bucket created with IAM role policy (EC2 can write)
2. ✅ S3 bucket has block public access enabled
3. ✅ IAM instance profile allows `s3:PutObject` on bucket

**Phase 4 (Compute & Deployment with SSL):**
1. ✅ EC2 instance running with Elastic IP
2. ✅ certbot installed with Route 53 DNS plugin
3. ✅ Let's Encrypt certificate issued for `matchcota.tech`
4. ✅ nginx configured with SSL (443) and HTTP redirect (80)
5. ✅ Route 53 A records: `matchcota.tech` and `protectora-pilot.matchcota.tech`
6. ✅ Backend deployed with RDS connection
7. ✅ Frontend built and served by nginx from local disk
8. ✅ HTTPS handshake succeeds: `https://matchcota.tech`
9. ✅ Admin can log in, manage animals, matching works
10. ✅ boto3 Route 53 integration tested (can create A record programmatically)

## Budget Impact

**Savings:**
- CloudFront: -$2/month (no longer needed)
- **New Monthly Cost:** $0 (Let's Encrypt is free)

**Stays within $50/month budget:**
- EC2 t3.micro: ~$7.50/month
- RDS db.t3.micro: ~$12/month
- Elastic IP: $0 (free when attached)
- S3: ~$0.50/month (minimal uploads)
- Route 53: $0.50/month (hosted zone)
- Data transfer: ~$1/month
- **Total: ~$21.50/month** ✅ Well under $50 limit

## Recommendation: Proceed with Revised Architecture

**Advantages:**
✅ Unblocks CloudFront IAM restriction immediately
✅ Stays within budget (actually cheaper)
✅ Delivers working HTTPS demo by Sprint 6 deadline
✅ More control over SSL and DNS
✅ Simpler architecture (fewer AWS services)

**Trade-offs Accepted:**
⚠️ No wildcard SSL (manual A record per tenant)
⚠️ No global CDN (EC2 only, acceptable for MVP)
⚠️ Manual cert renewal (90 days, cron job helps)
⚠️ EC2 single point of failure (v2 can add ASG)

**Action Items:**
1. ✅ Discard Phase 3 CloudFront work (3 commits, keep for reference)
2. 📝 Revise Phase 3 plan: S3 bucket for uploads only (~30min)
3. 📝 Expand Phase 4 plan: Add SSL setup, Route 53 automation, frontend build (~6h)
4. 📝 Update REQUIREMENTS.md: Remove CDN-03..09, add SSL-01..04, DNS-06..08
5. 📝 Update ROADMAP.md: Adjust success criteria and timeline
6. ▶️ Execute revised Phase 3 (S3 only)
7. ▶️ Execute expanded Phase 4 (EC2 + SSL + full deployment)
