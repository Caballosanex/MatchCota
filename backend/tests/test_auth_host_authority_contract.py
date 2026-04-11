import sys
from pathlib import Path

import pytest
from pydantic import ValidationError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.tenant import TenantIsolationDenyStatus


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
