import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.tenant import TenantIsolationDenyStatus
from app.config import settings
from app.core.tenant import resolve_tenant_slug_for_request


def test_host_hint_mismatch_contract_is_explicit_deny_shape():
    payload = TenantIsolationDenyStatus(
        registration_outcome="denied",
        handoff_status="tenant_mismatch",
        user_message_key="auth.tenant_mismatch",
        support_code="LOGIN-HOST_HINT_MISMATCH",
    ).model_dump()

    assert payload["registration_outcome"] == "denied"
    assert payload["handoff_status"] == "tenant_mismatch"
    assert payload["support_code"].startswith("LOGIN-")


def test_host_hint_mismatch_contract_does_not_leak_raw_detail():
    payload = TenantIsolationDenyStatus(
        registration_outcome="denied",
        handoff_status="tenant_mismatch",
        user_message_key="auth.tenant_mismatch",
        support_code="LOGIN-HOST_HINT_MISMATCH",
    ).model_dump()

    assert payload["user_message_key"] == "auth.tenant_mismatch"
    assert "detail" not in payload


def test_isolation_support_code_is_login_stage_scoped():
    valid = TenantIsolationDenyStatus(
        registration_outcome="denied",
        handoff_status="tenant_mismatch",
        user_message_key="auth.tenant_mismatch",
        support_code="LOGIN-TENANT_MISMATCH",
    )
    assert valid.support_code == "LOGIN-TENANT_MISMATCH"

    with pytest.raises(ValidationError):
        TenantIsolationDenyStatus(
            registration_outcome="denied",
            handoff_status="tenant_mismatch",
            user_message_key="auth.tenant_mismatch",
            support_code="CONTEXT-TENANT_MISMATCH",
        )


class _FakeRequest:
    def __init__(self, host: str, header_hint: str | None = None):
        self.headers = {"host": host}
        if header_hint is not None:
            self.headers["X-Tenant-Slug"] = header_hint


def test_production_host_authority_denies_conflicting_hint():
    original_env = settings.environment
    original_domain = settings.wildcard_domain
    settings.environment = "production"
    settings.wildcard_domain = "matchcota.tech"
    try:
        request = _FakeRequest(host="tenant-a.matchcota.tech", header_hint="tenant-b")

        with pytest.raises(HTTPException) as exc:
            resolve_tenant_slug_for_request(request, hint_slug="tenant-b", support_stage="LOGIN")

        assert getattr(exc.value, "status_code", None) == 403
        detail = getattr(exc.value, "detail", {})
        assert detail.get("handoff_status") == "tenant_mismatch"
        assert detail.get("support_code") == "LOGIN-HOST_HINT_MISMATCH"
    finally:
        settings.environment = original_env
        settings.wildcard_domain = original_domain
