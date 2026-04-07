# Coding Conventions

**Analysis Date:** 2026-04-07

## Code Style

**Backend (Python):**
- No linter config files detected (no `.flake8`, `pyproject.toml` linting section, etc.)
- Formatting follows standard Python conventions
- Docstrings in Catalan, code in English

**Frontend (JavaScript/React):**
- ESLint referenced in `package.json` but no config file present
- Run via: `npm run lint` (script: `eslint . --ext js,jsx`)
- No Prettier configuration detected

**Tailwind CSS:**
- Config: `frontend/tailwind.config.js`
- Custom colors defined: `primary`, `primary-dark`, `primary-light`

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Python files** | snake_case | `animals.py`, `tenant.py` |
| **Python functions** | snake_case | `get_animal_by_id()`, `create_access_token()` |
| **Python classes** | PascalCase | `Animal`, `TenantMiddleware` |
| **Python constants** | UPPER_SNAKE_CASE | `MATCHING_DIMENSIONS` |
| **JSX components** | PascalCase file & export | `Button.jsx`, `AnimalForm.jsx` |
| **JS hooks** | useXxx.js | `useAuth.js`, `useApi.js` |
| **JS contexts** | XxxContext.jsx | `AuthContext.jsx`, `TenantContext.jsx` |
| **API modules** | lowercase plural | `animals.js`, `tenants.js` |
| **DB models** | Singular PascalCase | `Animal`, `User`, `Tenant` |
| **DB tables** | lowercase plural | `animals`, `users`, `tenants` |

## Import Organization

**Backend (Python):**
```python
# 1. Standard library
from datetime import datetime
from typing import List, Optional
from uuid import UUID

# 2. Third-party
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# 3. Local app
from app.database import get_db
from app.models.animal import Animal
from app.core.tenant import get_current_tenant
```

**Frontend (JavaScript):**
```jsx
// 1. React core
import { useState, useEffect } from 'react';

// 2. React Router / third-party
import { Link, useNavigate } from 'react-router-dom';

// 3. Local components
import Button from '../../components/ui/Button';

// 4. Local hooks/contexts/api
import { useApi } from '../../hooks/useApi';
```

## Patterns Used

**Multi-tenant Isolation:**
- ALL database queries MUST filter by `tenant_id`
- Tenant resolved via `TenantMiddleware` (subdomain or `X-Tenant-Slug` header)
- Location: `backend/app/core/tenant.py`

**Three-Layer Architecture (Backend):**
- **API layer** (`backend/app/api/v1/`) - Route definitions, request validation
- **Service layer** (`backend/app/services/`) - Business logic, orchestration
- **CRUD layer** (`backend/app/crud/`) - Direct database operations

**Dependency Injection (FastAPI):**
```python
@router.get("/animals")
def list_animals(
    tenant: Tenant = Depends(get_current_tenant),  # Tenant injection
    db: Session = Depends(get_db)                   # DB session injection
):
```

**React Context for Global State:**
- `TenantContext` - Current protectora (shelter)
- `AuthContext` - Current user & auth token
- Pattern: Context + Provider + custom hook
- Example: `AuthContext.jsx` + `useAuth.js`

**Custom API Hook:**
- `useApi()` hook at `frontend/src/hooks/useApi.js`
- Auto-injects `Authorization` header and `X-Tenant-Slug`
- Returns `{ get, post, put, delete }` methods

**Pydantic Schemas (Backend):**
- Base schema for shared fields: `AnimalBase`
- Create schema extends Base: `AnimalCreate`
- Update schema with all optional: `AnimalUpdate`
- Response schema with computed fields: `AnimalResponse`
- Location: `backend/app/schemas/`

**Reusable UI Components (Frontend):**
- Generic components in `frontend/src/components/ui/`
- Props: `variant`, `size`, `isLoading`, `className`
- Example: `Button.jsx`, `Card.jsx`, `Input.jsx`

## Error Handling

**Backend - HTTPException:**
```python
# Location: backend/app/services/animals.py
if not animal:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Animal no trobat"
    )
```

**Backend - Auth Errors:**
```python
# Location: backend/app/api/v1/auth.py
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No s'han pogut validar les credencials",
    headers={"WWW-Authenticate": "Bearer"},
)
```

**Frontend - API Error Handling:**
```javascript
// Location: frontend/src/hooks/useApi.js
if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}`);
}
```

**Frontend - Component Error State:**
```jsx
// Location: frontend/src/pages/public/Animals.jsx
const [error, setError] = useState(null);
// ...
catch (err) {
    setError("No s'han pogut carregar els animals");
}
// ...
if (error) return <div className="text-red-600">{error}</div>;
```

## Type Hints & Validation

**Backend - Always use type hints:**
```python
def list_animals(
    db: Session,
    tenant_id: UUID,
    skip: int = 0,
    limit: int = 100,
    species: Optional[str] = None,
) -> List[Animal]:
```

**Backend - Pydantic validation:**
```python
class AnimalBase(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    energy_level: Optional[Decimal] = None
```

## Comments & Documentation

**Backend - Module Docstrings:**
```python
"""
Motor de Matching - Similitud del Cosinus.

Sistema purament matematic sense ML/LLM/OCR.
Compara vectors de 8 dimensions entre adoptants i animals.
"""
```

**Backend - Function Docstrings (Catalan):**
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica que una password coincideix amb el seu hash.

    Args:
        plain_password: Password en text pla
        hashed_password: Hash bcrypt guardat a BD

    Returns:
        True si coincideixen, False si no
    """
```

**Frontend - JSDoc Comments (Educational style):**
```jsx
/**
 * COMPONENTE: Button (Boto Reutilitzable)
 * ----------------------------------------------------------------------
 * Proposit: Aquest component es un boto generic que podem utilitzar...
 * 
 * @param {ReactNode} children - El contingut que va dins del boto
 * @param {string} variant - L'estil visual del boto (primary, secondary...)
 */
```

## API Conventions

**Response Format:**
- Success: Return JSON object or array directly
- Error: `{"detail": "Missatge d'error"}`

**Pagination:**
- Query params: `?skip=0&limit=20`
- Defaults: `skip=0`, `limit=20`
- Max limit enforced: 100

**Filtering:**
- Query params: `?species=dog&size=small&sex=male`

**REST Endpoints:**
- Public: `/api/v1/animals`
- Admin: `/api/v1/admin/animals`

## Git Conventions

**Branches:**
- `main` - Production
- `develop` - Development
- `feature/XXX` - New features
- `bugfix/XXX` - Bug fixes

**Commit Messages (Conventional Commits):**
```
feat: afegir formulari d'alta d'animal
fix: corregir calcul de compatibilitat
docs: actualitzar README
```

**CI/CD:**
- GitHub Actions for Telegram notifications: `.github/workflows/telegram-notify.yml`
- Notifies on push to any branch

---

*Convention analysis: 2026-04-07*
