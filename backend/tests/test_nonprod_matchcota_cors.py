from importlib import reload

from fastapi.testclient import TestClient

from app.config import settings


def test_nonprod_cors_allows_matchcota_tenant_origin():
    import app.main as main_module

    original_env = settings.environment
    settings.environment = "development"

    try:
        reloaded_main = reload(main_module)
        client = TestClient(reloaded_main.app)

        response = client.get("/api/v1/health", headers={"Origin": "https://patata.matchcota.tech"})

        assert response.status_code == 200
        assert response.headers.get("Access-Control-Allow-Origin") == "https://patata.matchcota.tech"
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    finally:
        settings.environment = original_env
