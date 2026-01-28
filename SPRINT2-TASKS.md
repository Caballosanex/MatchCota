# Sprint 2 - Tasques per DAW1 i DAW2

## 🚀 Setup Inicial (TOTS)

## 📚 Context: Què s'ha fet fins ara

### Sprint 1 (ASIX) ✅
- ✅ Estructura de carpetes completa
- ✅ Docker Compose amb 5 serveis (PostgreSQL, Redis, MailHog, Backend, Frontend)
- ✅ Models de base de dades (Tenant, User, Animal, Lead, Questionnaire)
- ✅ Migracions Alembic aplicades
- ✅ Configuració d'entorn (.env, config.py, validació)

### Fitxers importants creats:
- `backend/app/database.py` - Connexió PostgreSQL
- `backend/app/config.py` - Gestió de variables d'entorn
- `backend/app/models/` - Tots els models (tenant.py, user.py, animal.py, lead.py, questionnaire.py)
- `backend/alembic/` - Sistema de migracions
- `.env` - Variables d'entorn configurades
- `ENV.md` - Documentació completa d'entorn

### Models disponibles:
```python
from app.models import Tenant, User, Animal, Lead, Questionnaire
from app.database import get_db
from app.config import settings
```

---

## 👨‍💻 TASQUES DAW1 (Backend Core)

**Responsable:** Backend API, Auth, Middleware
**Hores totals:** 11h
**Prioritat:** Alta (bloqueig per DAW2)

---

### 📋 Tasca 2.6: Configurar CORS (1h) 🔴

**Objectiu:** Permetre que el frontend React faci requests a l'API.

**Fitxer a modificar:** `backend/app/main.py`

**Prompt per a la teva IA:**

```markdown
# CONTEXT
Estic treballant en MatchCota, un projecte FastAPI amb frontend React.
Tinc l'estructura base creada i necessito configurar CORS per permetre requests des del frontend.

# FITXERS IMPORTANTS
- backend/app/main.py - Aplicació FastAPI principal
- backend/app/config.py - Configuració (ja té settings.get_cors_origins())

# TASCA
Configura CORS middleware a FastAPI per permetre:
- Requests des de localhost:5173 (frontend Vite)
- Requests des de localhost:3000 (alternativa)
- Usar els orígens definits a settings.get_cors_origins()

# REQUISITS
1. Importar CORSMiddleware de fastapi.middleware.cors
2. Afegir middleware a l'app FastAPI
3. Permetre credentials, tots els methods i headers
4. Usar settings.get_cors_origins() per obtenir allowed_origins
5. En producció, això ja estarà configurat per retornar només *.matchcota.com

# REFERÈNCIA
Consulta CLAUDE.md per l'arquitectura del projecte.

# OUTPUT ESPERAT
- app.add_middleware(CORSMiddleware, ...) configurat correctament
- Poder fer requests des del frontend sense errors CORS
```

**Verificació:**
```bash
# Provar des del navegador console (http://localhost:5173)
fetch('http://localhost:8000/api/v1/health')
  .then(r => r.json())
  .then(d => console.log(d))

# No hauria de donar error CORS
```

---

### 📋 Tasca 2.1: Middleware Multi-tenant (3h) 🔴

**Objectiu:** Detectar el tenant actual basant-se en subdomini o header.

**Fitxers a crear:**
- `backend/app/core/tenant.py`

**Fitxers a modificar:**
- `backend/app/main.py` (afegir middleware)

**Prompt per a la teva IA:**

```markdown
# CONTEXT
MatchCota és una aplicació SaaS multi-tenant. Cada protectora té el seu subdomini:
- protectora-barcelona.matchcota.com
- protectora-madrid.matchcota.com

En desenvolupament local, usarem un header HTTP per simular-ho.

# ARQUITECTURA MULTI-TENANT (des de CLAUDE.md)
1. Request arriba amb subdomini o header X-Tenant-Slug
2. Middleware extreu slug (ex: "protectora-barcelona")
3. Busca Tenant a BD per slug
4. Guarda tenant_id en request.state
5. Tots els endpoints filtren per tenant_id

# TASCA
Crea backend/app/core/tenant.py amb:

1. **TenantMiddleware** (classe):
   - Hereda de BaseHTTPMiddleware
   - A __call__:
     - Extreu slug de request.headers.get("X-Tenant-Slug") o del subdomini
     - Busca tenant a BD: session.query(Tenant).filter_by(slug=slug).first()
     - Si no existeix, retorna 404 amb missatge "Tenant not found"
     - Guarda a request.state.tenant_id = tenant.id
     - Guarda a request.state.tenant = tenant (objecte complet)

2. **get_current_tenant()** (dependency):
   - Funció FastAPI dependency
   - Parametres: request: Request, db: Session = Depends(get_db)
   - Retorna: Tenant object
   - Obté tenant_id de request.state.tenant_id
   - Si no hi és, HTTPException 404
   - Retorna tenant de BD

3. **get_tenant_id()** (helper):
   - Dependency més simple que només retorna UUID del tenant_id
   - Útil per queries ràpides

# IMPLEMENTACIÓ
```python
from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import get_db
from app.models.tenant import Tenant

# Implementar aquí...
```

# REGLES IMPORTANTS
- En dev, prioritzar header X-Tenant-Slug
- En producció, usar subdomini del Host header
- Sempre validar que el tenant existeix i està actiu (tenant.status != "suspended")
- El middleware s'ha d'executar ABANS de qualsevol endpoint

# INTEGRACIÓ A MAIN.PY
Afegir middleware:
```python
from app.core.tenant import TenantMiddleware
app.add_middleware(TenantMiddleware)
```

# VERIFICACIÓ
Crear endpoint de test:
```python
@app.get("/api/v1/tenant/current")
def get_current_tenant_info(tenant: Tenant = Depends(get_current_tenant)):
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug
    }
```

Provar amb:
```bash
curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/tenant/current
```
```

**Verificació:**
```bash
# Primer crear un tenant demo manualment a la BD
docker-compose exec db psql -U postgres -d matchcota -c "
INSERT INTO tenants (id, slug, name, email)
VALUES (gen_random_uuid(), 'demo', 'Protectora Demo', 'demo@matchcota.com');
"

# Provar middleware
curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/tenant/current

# Hauria de retornar info del tenant
```

---

### 📋 Tasca 2.2: Autenticació JWT (4h) 🔴

**Objectiu:** Sistema complet d'auth amb JWT tokens.

**Fitxers a crear:**
- `backend/app/core/security.py`
- `backend/app/api/v1/auth.py`

**Fitxers a modificar:**
- `backend/app/api/v1/router.py` (afegir auth router)

**Prompt per a la teva IA:**

```markdown
# CONTEXT
Necessito implementar autenticació JWT per MatchCota.
Els usuaris són empleats de les protectores (model User a BD).

# MODELS DISPONIBLES
```python
from app.models.user import User  # té: id, tenant_id, email, password_hash, name, is_active
from app.models.tenant import Tenant
```

# CONFIGURACIÓ DISPONIBLE
```python
from app.config import settings
# settings.jwt_secret_key
# settings.jwt_algorithm (HS256)
# settings.jwt_expire_minutes (1440 = 24h)
```

# TASCA PART 1: backend/app/core/security.py

Crear funcions de seguretat:

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que la password coincideix amb el hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash d'una password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT token.

    Args:
        data: Diccionari amb claims (normalment: {"sub": user_id, "tenant_id": tenant_id})
        expires_delta: Temps d'expiració (per defecte settings.jwt_expire_minutes)

    Returns:
        Token JWT codificat
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    Descodifica un JWT token.

    Returns:
        Payload del token o None si és invàlid
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None
```

# TASCA PART 2: backend/app/api/v1/auth.py

Crear endpoints d'autenticació:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token, decode_access_token
from app.core.tenant import get_current_tenant
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    tenant_id: str

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Login d'un usuari.

    - Busca user per email dins del tenant
    - Verifica password
    - Retorna JWT token
    """
    # Buscar user per email dins del tenant
    user = db.query(User).filter(
        User.email == form_data.username,  # OAuth2 usa "username" per email
        User.tenant_id == tenant.id
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password incorrectes",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuari inactiu"
        )

    # Crear token
    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(tenant.id)}
    )

    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency per obtenir l'usuari actual des del JWT token.

    Ús:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No s'han pogut validar les credencials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retorna info de l'usuari actual."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "tenant_id": str(current_user.tenant_id)
    }
```

# TASCA PART 3: Integrar a main.py

```python
from app.api.v1 import auth

# Dins de create_app() o al setup dels routers:
app.include_router(auth.router, prefix="/api/v1")
```

# VERIFICACIÓ

1. Crear un usuari de prova:
```python
# docker-compose exec backend python
from app.database import SessionLocal
from app.models.user import User
from app.models.tenant import Tenant
from app.core.security import get_password_hash

db = SessionLocal()
tenant = db.query(Tenant).filter_by(slug="demo").first()

user = User(
    tenant_id=tenant.id,
    email="admin@demo.com",
    password_hash=get_password_hash("admin123"),
    username="admin",
    name="Admin Demo",
    is_active=True
)
db.add(user)
db.commit()
```

2. Provar login:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "X-Tenant-Slug: demo" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@demo.com&password=admin123"

# Retorna: {"access_token": "eyJ...", "token_type": "bearer"}
```

3. Provar endpoint protegit:
```bash
TOKEN="<token del pas anterior>"
curl "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN"

# Retorna info de l'usuari
```

# REQUISITS
- ✅ Password hasheada amb bcrypt
- ✅ JWT amb expiració de 24h
- ✅ Token inclou user_id i tenant_id
- ✅ Login filtrat per tenant
- ✅ get_current_user dependency reutilitzable
- ✅ Errors amb status codes correctes (401, 403)
```

---

### 📋 Tasca 2.3: Endpoints CRUD Tenant (2h) 🔴

**Objectiu:** Endpoints per gestionar tenants.

**Fitxers a crear:**
- `backend/app/api/v1/tenants.py`
- `backend/app/schemas/tenant.py` (Pydantic schemas)

**Prompt per a la teva IA:**

```markdown
# CONTEXT
Necessito endpoints per gestionar tenants (protectores).
- Públic: GET /tenant/current (obtenir info del tenant actual)
- Admin: POST /admin/tenants (crear nou tenant - només superadmin)

# TASCA

Crear backend/app/schemas/tenant.py:
```python
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class TenantBase(BaseModel):
    name: str
    slug: str
    email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: str
    logo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
```

Crear backend/app/api/v1/tenants.py:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantResponse
from app.core.tenant import get_current_tenant
import uuid

router = APIRouter(prefix="/tenants", tags=["tenants"])

@router.get("/current", response_model=TenantResponse)
def get_current_tenant_info(tenant: Tenant = Depends(get_current_tenant)):
    """
    Obtenir informació del tenant actual (públic).

    Usat pel frontend per mostrar logo, nom, etc. de la protectora.
    """
    return tenant

@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db)
):
    """
    Crear un nou tenant (protectora).

    TODO: Això hauria d'estar protegit per superadmin role.
    Per ara deixar-ho públic per testing.
    """
    # Verificar que slug és únic
    existing = db.query(Tenant).filter(Tenant.slug == tenant_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant amb slug '{tenant_data.slug}' ja existeix"
        )

    # Crear tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        **tenant_data.model_dump()
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return tenant
```

Integrar a main.py:
```python
from app.api.v1 import tenants
app.include_router(tenants.router, prefix="/api/v1")
```

# VERIFICACIÓ
```bash
# Obtenir tenant actual
curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/tenants/current

# Crear nou tenant
curl -X POST "http://localhost:8000/api/v1/tenants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Protectora Test",
    "slug": "test",
    "email": "test@matchcota.com",
    "city": "Barcelona"
  }'
```
```

---

### 📋 Tasca 2.8: Documentació Swagger (1h) 🟡

**Fitxer a modificar:** `backend/app/main.py`

**Prompt per a la teva IA:**

```markdown
# TASCA
Millorar la documentació automàtica de FastAPI (Swagger UI).

A backend/app/main.py, configurar:
```python
app = FastAPI(
    title="MatchCota API",
    description="API per la plataforma MatchCota - Matching intel·ligent entre adoptants i animals",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "auth", "description": "Autenticació i autorització"},
        {"name": "tenants", "description": "Gestió de protectores (tenants)"},
        {"name": "animals", "description": "Gestió d'animals"},
        {"name": "users", "description": "Gestió d'usuaris"},
        {"name": "leads", "description": "Gestió de leads (adoptants interessats)"},
        {"name": "matching", "description": "Sistema de compatibilitat"},
    ]
)
```

Afegir exemples als schemas Pydantic:
```python
class TenantCreate(BaseModel):
    name: str
    slug: str

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Protectora d'Animals de Barcelona",
                "slug": "protectora-barcelona",
                "email": "info@protectorabarcelona.cat"
            }
        }
```

# VERIFICACIÓ
Accedir a http://localhost:8000/docs i verificar que:
- Títol i descripció apareixen
- Tags estan organitzats
- Exemples apareixen als formularis
```

---

## 👨‍💻 TASQUES DAW2 (CRUD & Seeds)

**Responsable:** Endpoints CRUD, Seed Data
**Hores totals:** 9h
**Prerequisit:** Tasques DAW1 2.1 i 2.2 completades (auth + tenant funcionant)

---

### 📋 Tasca 2.4: Endpoints CRUD Animal (4h) 🔴

**Fitxers a crear:**
- `backend/app/api/v1/animals.py`
- `backend/app/schemas/animal.py`

**Prompt per a la teva IA:**

```markdown
# CONTEXT
Necessito endpoints CRUD complets per gestionar animals.
- Públics: GET /animals (llistat), GET /animals/{id} (detall)
- Privats (admin): POST, PUT, DELETE /admin/animals

El model Animal ja existeix a backend/app/models/animal.py.

# REGLA MULTI-TENANT CRÍTICA
TOTS els endpoints han de filtrar per tenant_id. Mai retornar animals d'altres tenants.

# TASCA PART 1: backend/app/schemas/animal.py

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

class AnimalBase(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[date] = None
    size: Optional[str] = None
    weight_kg: Optional[Decimal] = None
    microchip_number: Optional[str] = None
    description: Optional[str] = None
    medical_conditions: Optional[str] = None

    # Matching characteristics (0-10 scale)
    energy_level: Optional[Decimal] = None
    sociability: Optional[Decimal] = None
    attention_needs: Optional[Decimal] = None
    good_with_children: Optional[Decimal] = None
    good_with_dogs: Optional[Decimal] = None
    good_with_cats: Optional[Decimal] = None
    experience_required: Optional[Decimal] = None

class AnimalCreate(AnimalBase):
    pass

class AnimalUpdate(BaseModel):
    # Tots els camps opcionals per PATCH
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    # ... (resta de camps opcionals)

class AnimalResponse(AnimalBase):
    id: str
    tenant_id: str
    photo_urls: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

# TASCA PART 2: backend/app/api/v1/animals.py

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.animal import Animal
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.animal import AnimalCreate, AnimalUpdate, AnimalResponse
from app.core.tenant import get_current_tenant
from app.core.auth import get_current_user
import uuid

router = APIRouter(tags=["animals"])

# ============================================
# ENDPOINTS PÚBLICS
# ============================================

@router.get("/animals", response_model=List[AnimalResponse])
def list_animals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    species: Optional[str] = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Llistar animals disponibles del tenant actual.

    Filtres:
    - species: Filtrar per espècie (dog, cat, etc.)
    - skip/limit: Paginació
    """
    query = db.query(Animal).filter(Animal.tenant_id == tenant.id)

    if species:
        query = query.filter(Animal.species == species)

    animals = query.offset(skip).limit(limit).all()
    return animals

@router.get("/animals/{animal_id}", response_model=AnimalResponse)
def get_animal(
    animal_id: str,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Obtenir detall d'un animal."""
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.tenant_id == tenant.id  # CRÍTIC: filtrar per tenant
    ).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )

    return animal

# ============================================
# ENDPOINTS ADMIN (protegits amb auth)
# ============================================

@router.post("/admin/animals", response_model=AnimalResponse, status_code=status.HTTP_201_CREATED)
def create_animal(
    animal_data: AnimalCreate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Crear un nou animal (només admin).

    L'animal es crea automàticament dins del tenant de l'usuari actual.
    """
    animal = Animal(
        id=uuid.uuid4(),
        tenant_id=tenant.id,  # Assignar automàticament tenant
        **animal_data.model_dump()
    )
    db.add(animal)
    db.commit()
    db.refresh(animal)

    return animal

@router.put("/admin/animals/{animal_id}", response_model=AnimalResponse)
def update_animal(
    animal_id: str,
    animal_data: AnimalUpdate,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Actualitzar un animal (només admin del mateix tenant)."""
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.tenant_id == tenant.id  # CRÍTIC: només animals del propi tenant
    ).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )

    # Actualitzar només camps proporcionats
    update_data = animal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(animal, field, value)

    db.commit()
    db.refresh(animal)

    return animal

@router.delete("/admin/animals/{animal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_animal(
    animal_id: str,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Esborrar un animal (només admin del mateix tenant)."""
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.tenant_id == tenant.id
    ).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal no trobat"
        )

    db.delete(animal)
    db.commit()

    return None
```

Integrar a main.py:
```python
from app.api.v1 import animals
app.include_router(animals.router, prefix="/api/v1")
```

# VERIFICACIÓ

```bash
# 1. Crear animal (necessita auth token)
TOKEN="<token de /auth/login>"
curl -X POST "http://localhost:8000/api/v1/admin/animals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Slug: demo" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Luna",
    "species": "dog",
    "breed": "Golden Retriever",
    "sex": "female",
    "description": "Gossa molt afectuosa",
    "energy_level": 7,
    "sociability": 9,
    "good_with_children": 10
  }'

# 2. Llistar animals (públic)
curl -H "X-Tenant-Slug: demo" "http://localhost:8000/api/v1/animals"

# 3. Obtenir detall (públic)
curl -H "X-Tenant-Slug: demo" "http://localhost:8000/api/v1/animals/{id}"

# 4. Actualitzar (necessita auth)
curl -X PUT "http://localhost:8000/api/v1/admin/animals/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Slug: demo" \
  -H "Content-Type: application/json" \
  -d '{"description": "Descripció actualitzada"}'

# 5. Esborrar (necessita auth)
curl -X DELETE "http://localhost:8000/api/v1/admin/animals/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Slug: demo"
```

# REQUISITS
- ✅ Filtrat per tenant_id en TOTS els endpoints
- ✅ Paginació amb skip/limit
- ✅ Endpoints públics i admin separats
- ✅ Validació amb Pydantic schemas
- ✅ HTTP status codes correctes (200, 201, 204, 404)
```

---

### 📋 Tasca 2.5: Endpoints CRUD User (3h) 🔴

**Fitxers a crear:**
- `backend/app/api/v1/users.py`
- `backend/app/schemas/user.py`

**Prompt similar a 2.4, adaptat per Users**

---

### 📋 Tasca 2.7: Seed Data (2h) 🟡

**Fitxers a crear:**
- `backend/app/seeds/__init__.py`
- `backend/app/seeds/initial_data.py`

**Prompt per a la teva IA:**

```markdown
# TASCA
Crear script per generar dades de prova.

Crear backend/app/seeds/initial_data.py:
```python
from app.database import SessionLocal
from app.models import Tenant, User, Animal
from app.core.security import get_password_hash
import uuid

def create_demo_tenant():
    """Crear tenant demo si no existeix."""
    db = SessionLocal()

    tenant = db.query(Tenant).filter_by(slug="demo").first()
    if tenant:
        print("✓ Tenant 'demo' ja existeix")
        return tenant

    tenant = Tenant(
        id=uuid.uuid4(),
        slug="demo",
        name="Protectora Demo",
        email="demo@matchcota.com",
        city="Barcelona"
    )
    db.add(tenant)
    db.commit()
    print("✓ Tenant 'demo' creat")
    return tenant

def create_demo_users(tenant):
    """Crear usuaris demo."""
    db = SessionLocal()

    users_data = [
        {"email": "admin@demo.com", "username": "admin", "name": "Admin Demo", "password": "admin123"},
        {"email": "staff@demo.com", "username": "staff", "name": "Staff Demo", "password": "staff123"},
    ]

    for user_data in users_data:
        existing = db.query(User).filter_by(email=user_data["email"]).first()
        if existing:
            print(f"✓ User {user_data['email']} ja existeix")
            continue

        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            email=user_data["email"],
            username=user_data["username"],
            name=user_data["name"],
            password_hash=get_password_hash(user_data["password"]),
            is_active=True
        )
        db.add(user)
        print(f"✓ User {user_data['email']} creat (password: {user_data['password']})")

    db.commit()

def create_demo_animals(tenant):
    """Crear animals demo."""
    db = SessionLocal()

    animals_data = [
        {
            "name": "Luna",
            "species": "dog",
            "breed": "Golden Retriever",
            "sex": "female",
            "description": "Gossa molt afectuosa i ideal per famílies",
            "energy_level": 7,
            "sociability": 9,
            "good_with_children": 10,
        },
        {
            "name": "Max",
            "species": "dog",
            "breed": "Border Collie",
            "sex": "male",
            "description": "Gos actiu que necessita molt exercici",
            "energy_level": 10,
            "sociability": 8,
            "good_with_children": 7,
        },
        # ... afegir 3-5 animals més
    ]

    for animal_data in animals_data:
        existing = db.query(Animal).filter_by(
            name=animal_data["name"],
            tenant_id=tenant.id
        ).first()
        if existing:
            print(f"✓ Animal {animal_data['name']} ja existeix")
            continue

        animal = Animal(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            **animal_data
        )
        db.add(animal)
        print(f"✓ Animal {animal_data['name']} creat")

    db.commit()

def main():
    print("\n=== Generant dades de prova ===\n")

    tenant = create_demo_tenant()
    create_demo_users(tenant)
    create_demo_animals(tenant)

    print("\n✓ Dades de prova generades correctament!\n")
    print("Credencials:")
    print("  - admin@demo.com / admin123")
    print("  - staff@demo.com / staff123")
    print("\nProvar amb:")
    print('  curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/animals\n')

if __name__ == "__main__":
    main()
```

Crear backend/app/seeds/__init__.py (buit)

# EXECUTAR
```bash
docker-compose exec backend python -m app.seeds.initial_data
```
```

---

## 🎯 Ordre d'execució recomanat

### Setmana 1 - Fonaments (DAW1)
- Dia 1-2: Tasques 2.6 (CORS) + 2.1 (Tenant middleware)
- Dia 3-4: Tasca 2.2 (Auth JWT)
- Dia 5: Tasca 2.3 (CRUD Tenant)

### Setmana 2 - CRUD (DAW2 + polish)
- Dia 1-2: Tasca 2.4 (CRUD Animals)
- Dia 3: Tasca 2.5 (CRUD Users)
- Dia 4: Tasca 2.7 (Seeds) + 2.8 (Swagger)

---

## 📞 Suport

- **Documentació:** Consultar [CLAUDE.md](CLAUDE.md) per arquitectura
- **Configuració:** Consultar [ENV.md](ENV.md) per entorn
- **Models BD:** Revisar `backend/app/models/`
- **Logs:** `docker-compose logs -f backend`
- **Reiniciar:** `docker-compose restart backend`

---

**Última actualització:** Sprint 2 - 28/01/2026
