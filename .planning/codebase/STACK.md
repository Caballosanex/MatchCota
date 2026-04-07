# Stack

**Analysis Date:** 2026-04-07

## Languages & Runtime

**Backend:**
- Python 3.11+ — FastAPI application (`backend/`)
- SQL — PostgreSQL queries via SQLAlchemy

**Frontend:**
- JavaScript (ES Modules) — React SPA (`frontend/`)
- JSX — React components
- CSS — Tailwind utility classes

**Infrastructure:**
- YAML — Docker Compose, GitHub Actions workflows

## Runtime

**Backend:**
- Python 3.11 (Alpine-based Docker image)
- Uvicorn ASGI server

**Frontend:**
- Node.js 20 (Alpine-based Docker image)
- Vite dev server (port 5173)

**Databases:**
- PostgreSQL 15 (Alpine image)
- Redis 7 (Alpine image, optional - disabled by default)

## Frameworks

| Framework | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109.0 | Backend REST API framework |
| SQLAlchemy | 2.0.25 | ORM and database abstraction |
| Alembic | 1.13.1 | Database migrations |
| Pydantic | 2.5.3 | Request/response validation |
| React | 18.2.0 | Frontend UI library |
| React Router | 6.21.3 | Client-side routing |
| Vite | 5.0.11 | Frontend build tool and dev server |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |

## Key Dependencies

### Backend (`backend/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.109.0 | Web framework |
| uvicorn[standard] | 0.27.0 | ASGI server |
| sqlalchemy | 2.0.25 | ORM |
| alembic | 1.13.1 | Migrations |
| psycopg2-binary | 2.9.9 | PostgreSQL driver |
| python-jose[cryptography] | 3.3.0 | JWT token handling |
| passlib[bcrypt] | 1.7.4 | Password hashing |
| pydantic | 2.5.3 | Data validation |
| pydantic-settings | 2.1.0 | Environment config |
| email-validator | 2.1.0 | Email validation |
| boto3 | 1.34.28 | AWS S3 SDK |
| aiosmtplib | 3.0.1 | Async email sending |
| numpy | 1.26.3 | Vector math for matching algorithm |
| redis | 5.0.1 | Redis client (optional) |
| httpx | 0.26.0 | HTTP client for testing |
| pytest | 7.4.4 | Testing framework |
| pytest-asyncio | 0.23.3 | Async test support |
| pytest-cov | 4.1.0 | Test coverage |

### Frontend (`frontend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI library |
| react-dom | ^18.2.0 | React DOM renderer |
| react-router-dom | ^6.21.3 | Client-side routing |
| react-hook-form | ^7.71.2 | Form state management |
| @hookform/resolvers | ^5.2.2 | Form validation resolvers |
| zod | ^4.3.6 | Schema validation |
| tailwindcss | ^3.4.1 | CSS framework |
| vite | ^5.0.11 | Build tool |
| @vitejs/plugin-react | ^4.2.1 | React Vite plugin |
| eslint | ^8.56.0 | Linting |
| autoprefixer | ^10.4.17 | CSS prefixing |
| postcss | ^8.4.33 | CSS processing |

## Configuration

### Environment Variables

**Root config:** `.env` (loaded from `.env.example` template)

**Key sections:**
- Application: `ENVIRONMENT`, `DEBUG`, `APP_NAME`
- Security: `SECRET_KEY`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
- Database: `DATABASE_URL`, `DB_ECHO`
- Redis: `REDIS_URL`, `REDIS_ENABLED`
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_ENABLED`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
- Multi-tenant: `DEFAULT_SUBDOMAIN`, `WILDCARD_DOMAIN`
- Frontend: `VITE_API_URL`, `VITE_ENVIRONMENT`, `VITE_BASE_DOMAIN`

**Backend config class:** `backend/app/config.py` — Uses `pydantic-settings` to load and validate environment variables

**Frontend env:** `frontend/.env.example` — Vite-specific vars with `VITE_` prefix

### Build Configuration

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development environment orchestration |
| `docker-compose.prod.yml` | Production configuration (placeholder) |
| `backend/Dockerfile` | Python 3.11 Alpine container |
| `frontend/Dockerfile` | Node 20 Alpine container |
| `backend/alembic.ini` | Database migration configuration |
| `frontend/vite.config.js` | Vite build/dev config with API proxy |
| `frontend/tailwind.config.js` | Tailwind CSS customization |
| `frontend/postcss.config.js` | PostCSS plugins (Tailwind, Autoprefixer) |

## Build & Dev Tools

| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Alembic | Database schema migrations |
| Vite | Frontend dev server with HMR and production builds |
| ESLint | JavaScript/JSX linting |
| PostCSS | CSS transformation pipeline |
| pytest | Python unit testing |
| MailHog | Email capture for development (port 8025 for UI) |

## Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend alembic upgrade head

# Create migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Run backend tests
docker-compose exec backend pytest

# Frontend dev (if running outside Docker)
cd frontend && npm run dev

# Frontend build
cd frontend && npm run build
```

## Platform Requirements

**Development:**
- Docker and Docker Compose
- Port 8000 (backend API)
- Port 5173 (frontend dev server)
- Port 5432 (PostgreSQL)
- Port 6379 (Redis)
- Port 1025/8025 (MailHog SMTP/UI)

**Production Target:**
- AWS EC2 for compute
- AWS RDS for PostgreSQL
- AWS S3 for file storage
- AWS SES for email
- Uvicorn with 4 workers

---

*Stack analysis: 2026-04-07*
