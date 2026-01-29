from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.tenant import TenantMiddleware, get_current_tenant
from app.models.tenant import Tenant


app = FastAPI(
    title="MatchCota API",
    description="API per connectar protectores amb adoptants",
    version="0.1.0"
)

# Multi-tenant Middleware (inner layer)
app.add_middleware(TenantMiddleware)

# CORS - permetre requests des del frontend (outer layer)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "MatchCota API",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/api/v1/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/v1/tenant/current")
def get_current_tenant_info(tenant: Tenant = Depends(get_current_tenant)):
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug
    }

# Register Routers
from app.api.v1 import tenants
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])