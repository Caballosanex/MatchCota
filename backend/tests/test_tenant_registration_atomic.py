import sys
from pathlib import Path
from datetime import datetime, UTC
from uuid import uuid4

import pytest
from pydantic import ValidationError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.tenant import TenantCreate
from app.services import tenants as tenants_service
from app.crud import tenants as crud_tenants


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


class _FakeTenantModel:
    def __init__(self, **kwargs):
        self.id = kwargs.pop("id", None)
        self.created_at = kwargs.pop("created_at", datetime.now(UTC))
        self.updated_at = kwargs.pop("updated_at", datetime.now(UTC))
        for key, value in kwargs.items():
            setattr(self, key, value)


class _FakeUserModel:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class _FakeSession:
    def __init__(self, fail_on_user_add: bool = False):
        self.fail_on_user_add = fail_on_user_add
        self.pending_tenants = []
        self.pending_users = []
        self.tenants = []
        self.users = []
        self.commit_calls = 0
        self.rollback_calls = 0

    def add(self, obj):
        if isinstance(obj, _FakeUserModel):
            if self.fail_on_user_add:
                raise RuntimeError("forced user creation failure")
            self.pending_users.append(obj)
            return

        if isinstance(obj, _FakeTenantModel):
            self.pending_tenants.append(obj)
            return

        raise TypeError(f"Unsupported object type: {type(obj)!r}")

    def flush(self):
        for tenant in self.pending_tenants:
            if tenant.id is None:
                tenant.id = uuid4()

    def commit(self):
        self.commit_calls += 1
        self.tenants.extend(self.pending_tenants)
        self.users.extend(self.pending_users)
        self.pending_tenants = []
        self.pending_users = []

    def refresh(self, _obj):
        return None

    def rollback(self):
        self.rollback_calls += 1
        self.pending_tenants = []
        self.pending_users = []


def test_onboarding_creates_linked_admin_with_hashed_password(monkeypatch):
    db = _FakeSession()
    tenant_payload = TenantCreate(**_valid_tenant_payload(), admin_password="strongpass123")

    monkeypatch.setattr(crud_tenants, "Tenant", _FakeTenantModel)
    monkeypatch.setattr(crud_tenants, "get_tenant_by_slug", lambda _db, slug: None)
    monkeypatch.setattr(tenants_service, "User", _FakeUserModel)
    monkeypatch.setattr(tenants_service, "get_password_hash", lambda raw: f"hashed::{raw}")

    created = tenants_service.create_tenant(db, tenant_payload)
    created_tenant = db.tenants[0]

    assert db.commit_calls == 1
    assert len(db.tenants) == 1
    assert len(db.users) == 1
    assert created_tenant.id is not None

    created_user = db.users[0]
    assert created_user.tenant_id == created_tenant.id
    assert created_user.email == tenant_payload.email
    assert created_user.password_hash != tenant_payload.admin_password
    assert created_user.password_hash == "hashed::strongpass123"


def test_onboarding_rolls_back_when_user_creation_fails(monkeypatch):
    db = _FakeSession(fail_on_user_add=True)
    tenant_payload = TenantCreate(**_valid_tenant_payload(), admin_password="strongpass123")

    monkeypatch.setattr(crud_tenants, "Tenant", _FakeTenantModel)
    monkeypatch.setattr(crud_tenants, "get_tenant_by_slug", lambda _db, slug: None)
    monkeypatch.setattr(tenants_service, "User", _FakeUserModel)
    monkeypatch.setattr(tenants_service, "get_password_hash", lambda raw: f"hashed::{raw}")

    with pytest.raises(Exception):
        tenants_service.create_tenant(db, tenant_payload)

    assert db.rollback_calls == 1
    assert db.tenants == []
    assert db.users == []


def test_onboarding_create_succeeds_even_when_current_check_unresolved(monkeypatch):
    db = _FakeSession()
    tenant_payload = TenantCreate(**_valid_tenant_payload(), admin_password="strongpass123")

    monkeypatch.setattr(crud_tenants, "Tenant", _FakeTenantModel)
    monkeypatch.setattr(crud_tenants, "get_tenant_by_slug", lambda _db, slug: None)
    monkeypatch.setattr(tenants_service, "User", _FakeUserModel)
    monkeypatch.setattr(tenants_service, "get_password_hash", lambda raw: f"hashed::{raw}")
    monkeypatch.setattr(
        tenants_service,
        "evaluate_handoff_readiness",
        lambda _db, _tenant: {
            "registration_outcome": "success",
            "handoff_status": "action_required",
            "checks": [
                {"stage": "preboot", "status": "ok"},
                {"stage": "current", "status": "unresolved"},
                {"stage": "login", "status": "ok"},
            ],
            "fallback_actions": {"retry": True, "open": True, "copy": True},
            "user_message_key": "onboarding.handoff_action_required",
            "support_code": "CONTEXT-UNRESOLVED",
        },
    )

    created = tenants_service.create_tenant(db, tenant_payload)

    assert db.commit_calls == 1
    assert created["onboarding"].handoff_status == "action_required"
    assert created["onboarding"].support_code == "CONTEXT-UNRESOLVED"


def test_onboarding_service_does_not_reference_route53_runtime_mutation():
    service_path = PROJECT_ROOT / "app/services/tenants.py"
    content = service_path.read_text(encoding="utf-8")

    assert "create_tenant_dns_record" not in content
    assert "from app.services.route53" not in content
