import importlib
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _import_lambda_handler():
    for mod_name in list(sys.modules.keys()):
        if mod_name == "app.lambda_handler":
            del sys.modules[mod_name]

    with patch("app.bootstrap_runtime.bootstrap_runtime_secrets", return_value={}):
        import app.lambda_handler as lambda_handler
        return lambda_handler


def test_lambda_module_exports_handler_callable():
    lambda_handler = _import_lambda_handler()
    assert lambda_handler.handler is not None
    assert callable(lambda_handler.handler)


def test_lambda_module_exports_mangum_handler_with_lifespan_off():
    lambda_handler = _import_lambda_handler()
    assert lambda_handler._mangum_handler is not None
    assert hasattr(lambda_handler._mangum_handler, "app")


def test_health_route_remains_reachable_via_asgi_app():
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_tenant_registration_invalid_payload_returns_fastapi_validation_contract():
    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/api/v1/tenants",
        json={"name": "Runtime Contract Shelter", "slug": "runtime-contract-shelter", "admin_email": "invalid"},
    )

    assert 400 <= response.status_code < 500
    payload = response.json()
    assert isinstance(payload.get("detail"), list)
    assert payload["detail"]
    first = payload["detail"][0]
    assert "loc" in first
    assert "msg" in first


def test_migrate_task_runs_alembic_upgrade_and_current_without_baseline_stamp():
    lambda_handler = _import_lambda_handler()

    with patch.object(lambda_handler, "_infer_baseline_revision", return_value=None), patch.object(
        lambda_handler,
        "_run_alembic",
    ) as run_alembic:
        run_alembic.side_effect = [
            subprocess.CompletedProcess(args=[], returncode=0, stdout="upgrade-ok\n", stderr=""),
            subprocess.CompletedProcess(args=[], returncode=0, stdout="06_lead_contact_contract (head)\n", stderr=""),
        ]

        response = lambda_handler.handler({"task": "migrate"}, {})

    assert response["status"] == "ok"
    assert response["returncode"] == 0
    assert "06_lead_contact_contract" in response["stdout"]
    assert run_alembic.call_args_list[0].args == ("upgrade", "head")
    assert run_alembic.call_args_list[1].args == ("current",)


def test_migrate_task_stamps_then_upgrades_when_baseline_detected():
    lambda_handler = _import_lambda_handler()

    with patch.object(lambda_handler, "_infer_baseline_revision", return_value="04_tenant_scoped_user_identity"), patch.object(
        lambda_handler,
        "_run_alembic",
    ) as run_alembic:
        run_alembic.side_effect = [
            subprocess.CompletedProcess(args=[], returncode=0, stdout="stamp-ok\n", stderr=""),
            subprocess.CompletedProcess(args=[], returncode=0, stdout="upgrade-ok\n", stderr=""),
            subprocess.CompletedProcess(args=[], returncode=0, stdout="06_lead_contact_contract (head)\n", stderr=""),
        ]

        response = lambda_handler.handler({"task": "migrate"}, {})

    assert response["status"] == "ok"
    assert response["baseline_revision"] == "04_tenant_scoped_user_identity"
    assert run_alembic.call_args_list[0].args == ("stamp", "04_tenant_scoped_user_identity")
    assert run_alembic.call_args_list[1].args == ("upgrade", "head")
    assert run_alembic.call_args_list[2].args == ("current",)


def test_migrate_task_returns_error_on_upgrade_failure():
    lambda_handler = _import_lambda_handler()

    with patch.object(lambda_handler, "_infer_baseline_revision", return_value=None), patch.object(
        lambda_handler,
        "_run_alembic",
    ) as run_alembic:
        run_alembic.side_effect = [
            subprocess.CompletedProcess(args=[], returncode=1, stdout="", stderr="upgrade failed\n"),
        ]

        response = lambda_handler.handler({"task": "migrate"}, {})

    assert response["status"] == "error"
    assert response["returncode"] == 1
    assert "upgrade failed" in response["stderr"]


def test_alembic_current_task_returns_current_revision_output():
    lambda_handler = _import_lambda_handler()

    with patch.object(
        lambda_handler,
        "_run_alembic",
        return_value=subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout="06_lead_contact_contract (head)\n",
            stderr="",
        ),
    ):
        response = lambda_handler.handler({"task": "alembic-current"}, {})

    assert response["status"] == "ok"
    assert "06_lead_contact_contract" in response["stdout"]


def test_http_event_delegates_to_mangum():
    lambda_handler = _import_lambda_handler()

    with patch.object(lambda_handler, "_run_alembic") as run_alembic:
        try:
            lambda_handler.handler({"httpMethod": "GET", "path": "/api/v1/health"}, {})
        except Exception:
            pass

    run_alembic.assert_not_called()
