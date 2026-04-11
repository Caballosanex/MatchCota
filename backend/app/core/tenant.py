from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

import logging

from app.database import SessionLocal, get_db
from app.models.tenant import Tenant
from app.config import settings


logger = logging.getLogger(__name__)


def extract_tenant_slug_from_host(host_header: str | None) -> str | None:
    if not host_header:
        return None

    host = host_header.split(":")[0].lower().strip()
    wildcard_domain = settings.wildcard_domain.lower().strip()
    wildcard_suffix = f".{wildcard_domain}"

    if host == wildcard_domain or host == f"api.{wildcard_domain}":
        return None

    if host.endswith(wildcard_suffix):
        slug = host[: -len(wildcard_suffix)]
        return slug or None

    return None


def resolve_tenant_slug_for_request(
    request: Request,
    hint_slug: str | None = None,
    support_stage: str = "CONTEXT",
) -> str | None:
    header_hint = request.headers.get("X-Tenant-Slug")
    effective_hint = hint_slug or header_hint
    host_slug = extract_tenant_slug_from_host(request.headers.get("host", ""))

    if settings.is_production():
        if host_slug and effective_hint and host_slug != effective_hint:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "registration_outcome": "denied",
                    "handoff_status": "tenant_mismatch",
                    "user_message_key": "auth.tenant_mismatch",
                    "support_code": f"{support_stage}-HOST_HINT_MISMATCH",
                },
            )
        return host_slug or effective_hint

    return effective_hint or host_slug

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # CORS preflight no porta context de tenant i no s'ha de bloquejar.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Excloure rutes de sistema/docs que no requereixen tenant context
        # El /auth/login gestiona el tenant manualment per compatibilitat amb Swagger OAuth2
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/api/v1/health", "/", "/api/v1/tenants", "/api/v1/tenants/", "/api/v1/auth/login"] or request.url.path.startswith("/uploads") or request.url.path.startswith("/api/v1/uploads"):
            return await call_next(request)

        # 1. Extreure slug amb política canònica host-authority en producció
        try:
            slug = resolve_tenant_slug_for_request(request, support_stage="CONTEXT")
        except HTTPException as mismatch_exc:
            return JSONResponse(
                status_code=mismatch_exc.status_code,
                content={"detail": mismatch_exc.detail},
            )
        
        if not slug:
             return JSONResponse(
                 status_code=404, 
                 content={"detail": "Tenant slug missing. Use 'X-Tenant-Slug' header or subdomain."}
             )

        # 2. Buscar tenant a BD
        db = SessionLocal()
        try:
             tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
             
             if not tenant:
                 return JSONResponse(status_code=404, content={"detail": f"Tenant '{slug}' not found"})
                 
                 

             # 3. Guardar en request.state
             request.state.tenant_id = tenant.id
             request.state.tenant = tenant
             
        except Exception:
            logger.exception("Tenant resolution error")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal tenant resolution error"},
            )
        finally:
             db.close()
             
        response = await call_next(request)
        return response


def get_current_tenant(request: Request, db: Session = Depends(get_db)) -> Tenant:
    """
    Dependency per obtenir el tenant actual.
    El middleware ja hauria d'haver injectat el tenant_id.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    
    if not tenant_id:
         # Això passa si el middleware no s'ha executat o ha fallat
         raise HTTPException(status_code=500, detail="Tenant context missing in dependency")
         
    # Retornem l'objecte connectat a la sessió actual (db)
    # L'objecte request.state.tenant és d'una sessió tancada
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found in DB")
        
    return tenant


def get_tenant_id(request: Request) -> str:
    """Helper ràpid per obtenir només l'ID com a string."""
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=404, detail="Tenant context missing")
    return str(tenant_id)
