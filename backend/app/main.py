from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.tenant import TenantMiddleware


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

# Register Routers
from app.api.v1 import tenants, auth, animals, users
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(animals.router, prefix="/api/v1", tags=["animals"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])