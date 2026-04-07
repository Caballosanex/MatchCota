# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Backend:**
- pytest 7.4.4 with pytest-asyncio 0.23.3
- Coverage: pytest-cov 4.1.0
- Config: No `pytest.ini` or `pyproject.toml` test config detected
- Dependencies: `backend/requirements.txt`

**Frontend:**
- No test framework configured
- No Jest/Vitest config files found
- No test files (`.test.js`, `.spec.js`) present

## Test Structure

**Current State:**
```
backend/
  app/
    tests/
      __init__.py     # Empty - no tests implemented yet
```

**Expected Structure (from CLAUDE.md):**
```
backend/
  app/
    tests/
      __init__.py
      conftest.py       # Fixtures for db, tenant, auth
      test_auth.py      # Authentication tests
      test_animals.py   # Animal CRUD tests
      test_matching.py  # Matching engine tests
      test_tenants.py   # Multi-tenant tests
```

## Running Tests

**Backend:**
```bash
# Run all tests (from project root with Docker)
docker-compose exec backend pytest

# Run with coverage
docker-compose exec backend pytest --cov=app

# Run specific test file
docker-compose exec backend pytest app/tests/test_animals.py

# Run with verbose output
docker-compose exec backend pytest -v
```

**Frontend:**
```bash
# Not yet configured
# Expected setup would be:
npm test           # Run tests
npm run test:watch # Watch mode
npm run test:cov   # Coverage
```

## Expected Test Patterns

**Fixture Pattern (Backend):**
```python
# Expected in conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.tenant import Tenant

@pytest.fixture
def db_session():
    """Provide a test database session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_tenant(db_session):
    """Create a test tenant."""
    tenant = Tenant(slug="test", name="Test Shelter")
    db_session.add(tenant)
    db_session.commit()
    return tenant
```

**API Test Pattern (Backend):**
```python
# Expected pattern using FastAPI TestClient
from fastapi.testclient import TestClient
from app.main import app

def test_list_animals(test_tenant):
    client = TestClient(app)
    response = client.get(
        "/api/v1/animals",
        headers={"X-Tenant-Slug": test_tenant.slug}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Matching Engine Test Pattern:**
```python
# Expected for backend/app/matching/engine.py
import numpy as np
from app.matching.engine import (
    cosine_similarity,
    normalize_value,
    calculate_compatibility_score
)

def test_cosine_similarity_identical_vectors():
    vec = np.array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    result = cosine_similarity(vec, vec)
    assert result == 1.0

def test_normalize_value():
    assert normalize_value(0) == -1.0
    assert normalize_value(5) == 0.0
    assert normalize_value(10) == 1.0
    assert normalize_value(None) == 0.0
```

## Mocking Approach

**Database Mocking (Expected):**
```python
# Use SQLite in-memory for tests
# Override get_db dependency
from app.database import get_db

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
```

**Tenant Mocking (Expected):**
```python
# Mock tenant resolution for tests
from app.core.tenant import get_current_tenant

def mock_get_tenant():
    return Tenant(id=uuid4(), slug="test", name="Test")

app.dependency_overrides[get_current_tenant] = mock_get_tenant
```

**Auth Mocking (Expected):**
```python
# Mock authenticated user for admin tests
from app.api.v1.auth import get_current_user

def mock_get_current_user():
    return User(id=uuid4(), email="test@test.com", tenant_id=test_tenant_id)

app.dependency_overrides[get_current_user] = mock_get_current_user
```

## Coverage

**Current Status:**
- Coverage tool installed: pytest-cov 4.1.0
- No coverage reports generated (no tests exist)
- No coverage thresholds configured

**Expected Configuration (pyproject.toml):**
```toml
[tool.pytest.ini_options]
testpaths = ["app/tests"]
asyncio_mode = "auto"

[tool.coverage.run]
source = ["app"]
omit = ["app/tests/*", "app/__pycache__/*"]

[tool.coverage.report]
fail_under = 70
```

**Run Coverage:**
```bash
# Generate coverage report
docker-compose exec backend pytest --cov=app --cov-report=html

# View in browser
open backend/htmlcov/index.html
```

## Test Types

**Unit Tests (Not Implemented):**
- Matching engine calculations
- Password hashing/verification
- JWT token creation/validation
- Pydantic schema validation

**Integration Tests (Not Implemented):**
- Full API endpoint flow
- Database operations with tenant isolation
- Authentication flow

**E2E Tests (Not Planned for MVP):**
- No Playwright/Cypress configured
- Would test full user journeys

## Critical Areas Needing Tests

| Area | Priority | File to Test |
|------|----------|--------------|
| Matching engine | High | `backend/app/matching/engine.py` |
| Tenant isolation | High | All CRUD with tenant_id |
| Authentication | High | `backend/app/api/v1/auth.py` |
| Animal CRUD | Medium | `backend/app/services/animals.py` |
| Vector calculation | Medium | `backend/app/matching/engine.py` |

## Async Test Pattern

**For async endpoints (if needed):**
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_async_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
```

## Test Data Factories (Expected)

```python
# Expected in conftest.py or factories.py
from decimal import Decimal
from app.models.animal import Animal

def create_test_animal(tenant_id, **kwargs):
    """Factory for test animals."""
    defaults = {
        "name": "TestDog",
        "species": "dog",
        "energy_level": Decimal("5.0"),
        "sociability": Decimal("7.0"),
        "attention_needs": Decimal("3.0"),
        "good_with_children": Decimal("8.0"),
        "good_with_dogs": Decimal("6.0"),
        "good_with_cats": Decimal("4.0"),
        "experience_required": Decimal("2.0"),
        "maintenance_level": Decimal("5.0"),
    }
    defaults.update(kwargs)
    return Animal(tenant_id=tenant_id, **defaults)
```

---

*Testing analysis: 2026-04-07*
