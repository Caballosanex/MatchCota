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
