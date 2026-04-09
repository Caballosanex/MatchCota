import sys
from pathlib import Path

import pytest
from pydantic import ValidationError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.tenant import TenantCreate


def _valid_tenant_payload() -> dict:
    return {
        "name": "Shelter One",
        "slug": "shelter-one",
        "email": "admin@shelter-one.com",
    }


def test_registration_payload_requires_admin_password():
    with pytest.raises(ValidationError) as exc:
        TenantCreate(**_valid_tenant_payload())

    assert "admin_password" in str(exc.value)


def test_registration_payload_rejects_short_admin_password():
    with pytest.raises(ValidationError) as exc:
        TenantCreate(**_valid_tenant_payload(), admin_password="short")

    assert "admin_password" in str(exc.value)
