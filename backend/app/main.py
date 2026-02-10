from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.tenant import TenantMiddleware


app = FastAPI(
    title="MatchCota API",
    description="API per connectar protectores amb adoptants",
    version="0.1.0",
    swagger_ui_parameters={
        "persistAuthorization": True,  # Mantenir auth entre reloads
    }
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


# Configuració Swagger: Afegir header X-Tenant-Slug global
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    from fastapi.openapi.utils import get_openapi

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Afegir X-Tenant-Slug com a security scheme
    openapi_schema["components"]["securitySchemes"]["TenantHeader"] = {
        "type": "apiKey",
        "in": "header",
        "name": "X-Tenant-Slug",
        "description": "Tenant slug (ex: demo, protectora-barcelona)"
    }

    # Afegir security global a tots els endpoints
    for path in openapi_schema["paths"].values():
        for operation in path.values():
            if isinstance(operation, dict) and "security" in operation:
                # Si ja té security (OAuth2), afegir TenantHeader
                operation["security"].append({"TenantHeader": []})
            elif isinstance(operation, dict):
                # Si no té security, afegir TenantHeader
                operation["security"] = [{"TenantHeader": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi