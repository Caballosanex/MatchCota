from fastapi.testclient import TestClient

from app.config import settings


def _build_production_client(*, raise_server_exceptions: bool = True):
    import app.main as main_module

    original_env = settings.environment
    settings.environment = "production"

    try:
        from importlib import reload

        reloaded_main = reload(main_module)
        return TestClient(reloaded_main.app, raise_server_exceptions=raise_server_exceptions), original_env
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


def test_production_cors_preflight_includes_cors_headers_for_tenant_subdomain():
    client, original_env = _build_production_client()

    try:
        response = client.options(
            "/api/v1/admin/upload",
            headers={
                "Origin": "https://shelter1.matchcota.tech",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization, content-type, x-tenant-slug, x-tenant-id",
            },
        )

        assert response.status_code == 204
        assert response.headers.get("Access-Control-Allow-Origin") == "https://shelter1.matchcota.tech"
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    finally:
        settings.environment = original_env


def test_production_cors_preflight_includes_cors_headers_for_public_leads_submit():
    client, original_env = _build_production_client()

    try:
        response = client.options(
            "/api/v1/leads",
            headers={
                "Origin": "https://shelter1.matchcota.tech",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type, x-tenant-slug",
            },
        )

        assert response.status_code == 204
        assert response.headers.get("Access-Control-Allow-Origin") == "https://shelter1.matchcota.tech"
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    finally:
        settings.environment = original_env


def test_production_cors_includes_headers_on_tenant_error_response():
    client, original_env = _build_production_client()

    try:
        response = client.post(
            "/api/v1/leads",
            headers={"Origin": "https://shelter1.matchcota.tech"},
            json={"name": "No Tenant Context"},
        )

        assert response.status_code == 404
        assert response.headers.get("Access-Control-Allow-Origin") == "https://shelter1.matchcota.tech"
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    finally:
        settings.environment = original_env
