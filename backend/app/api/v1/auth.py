"""
Endpoints d'autenticació per MatchCota.

Inclou:
- POST /login - Autenticació amb email/password
- GET /me - Info de l'usuari actual
- get_current_user - Dependency per endpoints protegits
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.core.security import verify_password, create_access_token, decode_access_token


router = APIRouter(prefix="/auth", tags=["auth"])

# OAuth2 scheme per extreure token del header Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ============================================
# SCHEMAS
# ============================================

class Token(BaseModel):
    """Resposta del login."""
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    """Info de l'usuari actual."""
    id: str
    email: str
    username: str
    name: str | None
    tenant_id: str


# ============================================
# DEPENDENCIES
# ============================================

def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency per obtenir l'usuari actual des del JWT token.

    Validacions:
    1. Token vàlid i no expirat
    2. Usuari existeix a BD
    3. tenant_id del token coincideix amb el tenant del header/subdomini

    Ús:
        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": str(current_user.id)}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No s'han pogut validar les credencials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Decodificar token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    jwt_tenant_id: str = payload.get("tenant_id")

    if user_id is None or jwt_tenant_id is None:
        raise credentials_exception

    # 2. Validar coincidència de tenant (JWT vs header/subdomini)
    header_tenant_id = getattr(request.state, "tenant_id", None)
    if not header_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context missing"
        )
    if str(jwt_tenant_id) != str(header_tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token no vàlid per aquest tenant"
        )

    # 3. Carregar usuari de BD
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


# ============================================
# ENDPOINTS
# ============================================

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Autenticació d'un usuari.

    - Busca l'usuari per email dins del tenant especificat
    - Verifica la password
    - Retorna un JWT token

    El camp "username" del formulari s'usa per l'email (estàndard OAuth2).

    **Per Swagger UI:**
    - Posa el tenant slug al camp **client_id** (exemple: "demo")
    - username: admin@demo.com
    - password: admin123
    """
    # Obtenir tenant slug de múltiples fonts (per compatibilitat)
    tenant_slug = None

    # 1. Intentar des de client_id (Swagger OAuth2 sempre mostra aquest camp)
    if form_data.client_id:
        tenant_slug = form_data.client_id

    # 2. Si no, intentar des de scope
    if not tenant_slug and form_data.scopes:
        tenant_slug = form_data.scopes[0] if isinstance(form_data.scopes, list) else form_data.scopes

    # 3. Si no, des del header X-Tenant-Slug
    if not tenant_slug:
        tenant_slug = request.headers.get("X-Tenant-Slug")

    # 4. Si no, des del state del middleware (si s'ha executat)
    if not tenant_slug:
        tenant_id_from_middleware = getattr(request.state, "tenant_id", None)
        if tenant_id_from_middleware:
            tenant = db.query(Tenant).filter(Tenant.id == tenant_id_from_middleware).first()
            if tenant:
                tenant_slug = tenant.slug

    if not tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant slug missing. Use client_id field (e.g., 'demo') or X-Tenant-Slug header."
        )

    # Buscar tenant
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_slug}' not found"
        )

    # Buscar user per email dins del tenant
    user = db.query(User).filter(
        User.email == form_data.username,
        User.tenant_id == tenant.id
    ).first()

    # Verificar credencials
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password incorrectes",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear token amb user_id i tenant_id
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": str(tenant.id)
        }
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retorna informació de l'usuari autenticat.

    Requereix header: Authorization: Bearer <token>
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "name": current_user.name,
        "tenant_id": str(current_user.tenant_id)
    }
