# Integrations

**Analysis Date:** 2026-04-07

## Databases

| Database | Purpose | Connection |
|----------|---------|------------|
| PostgreSQL 15 | Primary data store | `DATABASE_URL` env var, SQLAlchemy ORM |
| Redis 7 | Cache/sessions (optional) | `REDIS_URL` env var, disabled by default (`REDIS_ENABLED=false`) |

### PostgreSQL Configuration

**Connection pooling:** Configured in `backend/app/database.py`
- Pool size: 10 persistent connections
- Max overflow: 20 temporary connections
- Pool pre-ping: Enabled (handles RDS restarts)
- Pool recycle: 3600 seconds (1 hour)

**Migrations:** Alembic
- Config: `backend/alembic.ini`
- Versions: `backend/alembic/versions/`
- Auto-generates from SQLAlchemy models

**Development:**
```
postgresql://postgres:postgres@db:5432/matchcota
```

**Production (AWS RDS):**
```
postgresql://matchcota_user:PASSWORD@matchcota-db.xxxxx.us-east-1.rds.amazonaws.com:5432/matchcota
```

## External APIs

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| AWS S3 | Image/file storage | IAM credentials or EC2 IAM role |
| AWS SES | Transactional email (production) | SMTP credentials |
| Telegram Bot API | Commit notifications (CI/CD) | Bot token via GitHub secrets |

### AWS S3 Integration

**Client:** boto3 v1.34.28  
**Implementation:** `backend/app/services/storage.py`

**Configuration:**
- `AWS_ACCESS_KEY_ID` — IAM access key
- `AWS_SECRET_ACCESS_KEY` — IAM secret key
- `AWS_REGION` — AWS region (default: `us-east-1`)
- `S3_BUCKET_NAME` — Target bucket
- `S3_ENABLED` — Toggle (false in dev, true in prod)

**Behavior:**
- Development: Files saved locally to `backend/uploads/{tenant_id}/`
- Production: Files uploaded to `s3://{bucket}/animals/{tenant_id}/{filename}`

**URL format (production):**
```
https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/animals/{tenant_id}/{filename}
```

### AWS SES Integration

**Client:** aiosmtplib v3.0.1  
**SMTP endpoint:** `email-smtp.{region}.amazonaws.com:587`

**Development alternative:** MailHog
- SMTP: `mailhog:1025`
- Web UI: `http://localhost:8025`

## Authentication

### JWT Authentication (Custom Implementation)

**Location:** `backend/app/core/security.py`

**Libraries:**
- `python-jose[cryptography]` — JWT encoding/decoding
- `passlib[bcrypt]` — Password hashing

**Configuration:**
- `JWT_SECRET_KEY` — Signing key (must be unique per environment)
- `JWT_ALGORITHM` — `HS256`
- `JWT_EXPIRE_MINUTES` — Token TTL (default: 1440 = 24 hours)

**Token payload:**
```json
{
  "sub": "<user_id>",
  "tenant_id": "<tenant_id>",
  "exp": <expiration_timestamp>
}
```

**Functions:**
- `create_access_token(data, expires_delta)` — Generate JWT
- `decode_access_token(token)` — Validate and decode JWT
- `verify_password(plain, hashed)` — Verify password
- `get_password_hash(password)` — Hash password with bcrypt

## Multi-Tenant Resolution

**Middleware:** `backend/app/core/tenant.py` → `TenantMiddleware`

**Resolution order:**
1. `X-Tenant-Slug` HTTP header (priority in dev/Swagger)
2. Subdomain extraction from Host header

**Subdomain pattern:**
```
{tenant_slug}.matchcota.local  (development)
{tenant_slug}.matchcota.com    (production)
```

**Injected state:**
- `request.state.tenant_id` — UUID of resolved tenant
- `request.state.tenant` — Full Tenant model object

**Excluded paths:** `/docs`, `/redoc`, `/openapi.json`, `/api/v1/health`, `/`, `/api/v1/tenants`, `/api/v1/auth/login`, `/uploads/*`

## File Storage

### Local Storage (Development)

**Location:** `backend/uploads/{tenant_id}/`  
**URL pattern:** `/uploads/{tenant_id}/{filename}`  
**Mount:** Static files served via FastAPI `StaticFiles` in `backend/app/main.py`

### S3 Storage (Production)

**Bucket structure:**
```
{bucket}/
└── animals/
    └── {tenant_id}/
        └── {uuid}.{ext}
```

**Upload flow:**
1. Validate file type (JPEG, PNG, WebP only)
2. Validate file size (max 10MB)
3. Generate UUID filename
4. Upload to S3 with content-type header
5. Return public URL

**Implementation:** `backend/app/services/storage.py` → `upload_file()`

## Email/Notifications

### Transactional Email

**Development:** MailHog (email capture)
- SMTP: `mailhog:1025`
- No auth required
- Web UI at `http://localhost:8025`

**Production:** AWS SES
- SMTP: `email-smtp.us-east-1.amazonaws.com:587`
- TLS enabled
- Sender: `noreply@matchcota.com`

**Configuration:**
- `SMTP_HOST`, `SMTP_PORT`
- `SMTP_USER`, `SMTP_PASSWORD`
- `SMTP_TLS`, `SMTP_SSL`
- `EMAIL_FROM`, `EMAIL_FROM_NAME`

### CI/CD Notifications

**Service:** Telegram Bot API  
**Workflow:** `.github/workflows/telegram-notify.yml`

**Triggers:** Push to any branch

**Secrets required:**
- `TELEGRAM_BOT_TOKEN` — Bot authentication
- `TELEGRAM_CHAT_ID` — Target chat/group

**Notification content:**
- Repository name
- Branch name
- Author
- Commit SHA (short)
- Commit message
- Commit URL

## Webhooks & Callbacks

### Incoming Webhooks

None configured.

### Outgoing Webhooks

**Telegram notifications:** Outgoing HTTP POST to `api.telegram.org` on git push events.

## CORS Configuration

**Development:** Permissive CORS via FastAPI middleware
- Origins: `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`, `127.0.0.1:3000`
- Credentials: Allowed
- Methods/Headers: All

**Production:** Dynamic CORS validation
- Pattern: `https://([a-z0-9\-]+\.)?matchcota\.com`
- Custom middleware in `backend/app/main.py`
- Validates origin header against regex

## API Proxy (Development)

**Vite proxy configuration:** `frontend/vite.config.js`

| Path | Target |
|------|--------|
| `/api/*` | `http://backend:8000` (Docker) or `http://localhost:8000` |
| `/uploads/*` | `http://backend:8000` (Docker) or `http://localhost:8000` |

## Infrastructure Services (Planned)

**Terraform modules:** `infrastructure/terraform/` (placeholder, details in Sprint 6)

**Target AWS services:**
- EC2 — Compute
- RDS — PostgreSQL
- S3 — File storage
- CloudFront — CDN
- Route 53 — DNS with wildcard
- SES — Email
- IAM — Access management

---

*Integration audit: 2026-04-07*
