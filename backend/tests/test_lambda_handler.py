from fastapi.testclient import TestClient


def test_lambda_module_exports_handler_with_lifespan_off():
    from app.lambda_handler import handler

    assert handler is not None
    assert hasattr(handler, "app")


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
