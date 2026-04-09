from fastapi.testclient import TestClient

from app.config import settings


def _build_production_client():
    import app.main as main_module

    original_env = settings.environment
    settings.environment = "production"

    try:
        from importlib import reload

        reloaded_main = reload(main_module)
        return TestClient(reloaded_main.app), original_env
    except Exception:
        settings.environment = original_env
        raise


def test_production_cors_allows_matchcota_apex_origin():
    client, original_env = _build_production_client()

    try:
        response = client.get("/api/v1/health", headers={"Origin": "https://matchcota.tech"})

        assert response.status_code == 200
        assert response.headers.get("Access-Control-Allow-Origin") == "https://matchcota.tech"
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    finally:
        settings.environment = original_env


def test_production_cors_allows_matchcota_subdomain_origin():
    client, original_env = _build_production_client()

    try:
        response = client.get("/api/v1/health", headers={"Origin": "https://demo.matchcota.tech"})

        assert response.status_code == 200
        assert response.headers.get("Access-Control-Allow-Origin") == "https://demo.matchcota.tech"
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    finally:
        settings.environment = original_env


def test_production_cors_rejects_unrelated_origin_without_fallback_header():
    client, original_env = _build_production_client()

    try:
        response = client.get("/api/v1/health", headers={"Origin": "https://evil.example.com"})

        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" not in response.headers
    finally:
        settings.environment = original_env
