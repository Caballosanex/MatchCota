import sys
from pathlib import Path

import pytest
from pydantic import ValidationError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.tenant import (
    OnboardingHandoffCheck,
    OnboardingHandoffStatus,
    TenantRegistrationResponse,
)


def _base_payload() -> dict:
    return {
        "registration_outcome": "success",
        "handoff_status": "action_required",
        "checks": [
            {"stage": "preboot", "status": "ok"},
            {"stage": "current", "status": "unresolved"},
            {"stage": "login", "status": "ok"},
        ],
        "fallback_actions": {
            "retry": True,
            "open": True,
            "copy": True,
        },
        "user_message_key": "onboarding.handoff_action_required",
        "support_code": "CONTEXT-UNRESOLVED",
    }


def test_onboarding_status_contract_exposes_checks_and_fallback_actions():
    status = OnboardingHandoffStatus(**_base_payload())

    assert len(status.checks) == 3
    assert all(isinstance(check, OnboardingHandoffCheck) for check in status.checks)
    assert status.fallback_actions.model_dump() == {
        "retry": True,
        "open": True,
        "copy": True,
    }


def test_onboarding_status_contract_has_curated_message_and_support_code_only():
    status = OnboardingHandoffStatus(**_base_payload())
    dumped = status.model_dump()

    assert dumped["user_message_key"] == "onboarding.handoff_action_required"
    assert dumped["support_code"].startswith("CONTEXT-")
    assert "detail" not in dumped


def test_support_code_must_encode_create_context_or_login_stage():
    valid_create = OnboardingHandoffStatus(**{**_base_payload(), "support_code": "CREATE-SUCCESS"})
    valid_context = OnboardingHandoffStatus(**{**_base_payload(), "support_code": "CONTEXT-DEGRADED"})
    valid_login = OnboardingHandoffStatus(**{**_base_payload(), "support_code": "LOGIN-MISMATCH"})

    assert valid_create.support_code == "CREATE-SUCCESS"
    assert valid_context.support_code == "CONTEXT-DEGRADED"
    assert valid_login.support_code == "LOGIN-MISMATCH"

    with pytest.raises(ValidationError):
        OnboardingHandoffStatus(**{**_base_payload(), "support_code": "DNS-FAILED"})


def test_tenant_registration_response_includes_onboarding_contract():
    response = TenantRegistrationResponse(
        id="d2719f9a-9ea9-4cf3-b34f-c743662f87d0",
        name="Shelter",
        slug="shelter",
        email="admin@shelter.tech",
        created_at="2026-04-11T00:00:00Z",
        updated_at="2026-04-11T00:00:00Z",
        onboarding=_base_payload(),
    )

    assert response.onboarding.handoff_status == "action_required"
    assert response.onboarding.support_code == "CONTEXT-UNRESOLVED"
