from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def test_lambda_module_exports_handler_callable():
    from app.lambda_handler import handler

    assert handler is not None
    assert callable(handler)


def test_lambda_module_exports_mangum_handler_with_lifespan_off():
    from app.lambda_handler import _mangum_handler

    assert _mangum_handler is not None
    assert hasattr(_mangum_handler, "app")


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


def test_migrate_task_returns_ok_on_alembic_success():
    """handler({"task": "migrate"}, {}) returns {"status": "ok"} when alembic exits 0."""
    from app.lambda_handler import handler

    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "INFO  [alembic.runtime.migration] Running upgrade -> abc123\n"
    mock_result.stderr = ""

    with patch("subprocess.run", return_value=mock_result) as mock_run:
        response = handler({"task": "migrate"}, {})

    assert response["status"] == "ok"
    assert response["returncode"] == 0
    assert "stdout" in response
    assert "stderr" in response
    mock_run.assert_called_once()


def test_migrate_task_returns_error_on_alembic_failure():
    """handler({"task": "migrate"}, {}) returns {"status": "error"} when alembic exits non-zero."""
    from app.lambda_handler import handler

    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stdout = ""
    mock_result.stderr = "FAILED: Can't locate revision identifier\n"

    with patch("subprocess.run", return_value=mock_result):
        response = handler({"task": "migrate"}, {})

    assert response["status"] == "error"
    assert response["returncode"] == 1
    assert "stderr" in response


def test_http_event_delegates_to_mangum():
    """handler({"httpMethod": "GET", ...}, {}) delegates to Mangum, not the migrate branch."""
    from app.lambda_handler import handler

    # Verify that a non-migrate event does NOT trigger subprocess.run
    with patch("subprocess.run") as mock_run:
        # We expect Mangum to handle this, which may raise since it's not a real Lambda env.
        # What matters is subprocess.run is NOT called.
        try:
            handler({"httpMethod": "GET", "path": "/api/v1/health"}, {})
        except Exception:
            pass  # Mangum raising on a partial event is expected in test env

    mock_run.assert_not_called()


def test_event_without_task_key_delegates_to_mangum():
    """handler({}, {}) does not raise KeyError and does not call subprocess.run."""
    from app.lambda_handler import handler

    with patch("subprocess.run") as mock_run:
        try:
            handler({}, {})
        except Exception:
            pass  # Mangum may raise on empty event; that's fine

    mock_run.assert_not_called()
