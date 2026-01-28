from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.database import SessionLocal, get_db
from app.models.tenant import Tenant
from app.config import settings

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Excloure rutes de sistema/docs que no requereixen tenant context
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/api/v1/health", "/"]:
            return await call_next(request)

        # 1. Extreure slug (prioritat header en dev)
        slug = request.headers.get("X-Tenant-Slug")
        
        if not slug:
            # Intentar extreure del subdomini
            host = request.headers.get("host", "").split(":")[0]  # Treure port
            
            # Lògica bàsica de subdomini
            # Si el host acaba en el domini base, agafem la part del davant
            domain_suffix = f".{settings.wildcard_domain}"
            if host.endswith(domain_suffix):
                 slug = host[:-len(domain_suffix)]
            elif host == settings.wildcard_domain:
                 # Root domain -> potser no hi ha tenant o és un landing global
                 # Per ara, retornarem 404 si no hi ha header
                 pass
        
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
             
        except Exception as e:
            # Capturar errors de BD
            return JSONResponse(status_code=500, content={"detail": f"Tenant resolution error: {str(e)}"})
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
