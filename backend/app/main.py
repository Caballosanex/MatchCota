import os
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.tenant import TenantMiddleware


def _is_lambda_runtime() -> bool:
    return bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME")) or os.getenv("AWS_EXECUTION_ENV", "").startswith("AWS_Lambda")


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

if settings.is_production():
    # Producció: CORS dinàmic que accepta qualsevol subdomini de matchcota.tech
    # El wildcard "*" no funciona amb allow_credentials=True,
    # així que validem l'origin dinàmicament amb regex.
    _allowed_origin_re = re.compile(
        r"^https://([a-z0-9\-]+\.)?matchcota\.tech$"
    )

    @app.middleware("http")
    async def dynamic_cors(request, call_next):
        origin = request.headers.get("origin", "")

        if request.method == "OPTIONS":
            from fastapi.responses import Response

            response = Response(status_code=204)
        else:
            response = await call_next(request)

        if _allowed_origin_re.match(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Tenant-Slug, X-Tenant-ID"

        return response
else:
    # Desenvolupament: CORS permissiu per localhost
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

# Mount local uploads directory only for non-production local runtime
if not settings.is_production() and not _is_lambda_runtime():
    uploads_path = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(uploads_path, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Register Routers
from app.api.v1 import tenants, auth, animals, users, upload, matching, leads
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(animals.router, prefix="/api/v1", tags=["animals"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(matching.router, prefix="/api/v1", tags=["matching"])
app.include_router(leads.router, prefix="/api/v1", tags=["leads"])


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
