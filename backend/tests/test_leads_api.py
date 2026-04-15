from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.v1 import leads as leads_api


TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")


def _build_app():
    app = FastAPI()
    app.include_router(leads_api.router, prefix="/api/v1")

    def _override_current_user():
        return SimpleNamespace(id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), tenant_id=TENANT_ID)

    def _override_current_tenant():
        return SimpleNamespace(id=TENANT_ID, slug="tenant-a")

    def _override_get_db():
        yield SimpleNamespace()

    app.dependency_overrides[leads_api.get_current_user] = _override_current_user
    app.dependency_overrides[leads_api.get_current_tenant] = _override_current_tenant
    app.dependency_overrides[leads_api.get_db] = _override_get_db
    return app


def _admin_headers():
    return {
        "Authorization": "Bearer test-token",
        "X-Tenant-Slug": "tenant-a",
    }


def _lead_detail_payload(lead_id: UUID, *, status: str, compatibility: float, animal_id: str):
    return {
        "id": lead_id,
        "tenant_id": TENANT_ID,
        "name": "Lead Detail",
        "email": "detail@example.com",
        "phone": "+34999999999",
        "status": status,
        "questionnaire_responses": {"children": "no"},
        "top_matches": [{"animal_id": animal_id, "score": compatibility}],
        "scores": {"compatibility": compatibility},
        "created_at": datetime(2026, 4, 14, 9, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 4, 14, 9, 15, tzinfo=timezone.utc),
    }


def test_create_lead_returns_201_receipt_contract(monkeypatch):
    created_at = datetime(2026, 4, 15, 16, 30, tzinfo=timezone.utc)
    lead_id = UUID("22222222-2222-2222-2222-222222222222")

    def _fake_create_lead(_db, _lead_data, tenant_id):
        assert tenant_id == TENANT_ID
        return SimpleNamespace(id=lead_id, created_at=created_at)

    monkeypatch.setattr(leads_api.leads_service, "create_lead", _fake_create_lead)
    client = TestClient(_build_app())

    response = client.post(
        "/api/v1/leads",
        json={"name": "Ada", "email": "ada@example.com", "questionnaire_responses": {"energy": "high"}},
    )

    assert response.status_code == 201
    payload = response.json()
    assert set(payload.keys()) == {"id", "created_at", "message"}
    assert payload["id"] == str(lead_id)
    assert payload["message"] == "Lead submitted successfully"


def test_create_lead_requires_at_least_one_contact_medium():
    client = TestClient(_build_app())

    response = client.post("/api/v1/leads", json={"name": "No Contact"})

    assert response.status_code == 422


def test_admin_list_applies_status_filter_and_returns_summary_only(monkeypatch):
    def _fake_list_leads(_db, tenant_id, skip, limit, lead_status):
        assert tenant_id == TENANT_ID
        assert skip == 0
        assert limit == 20
        assert lead_status == "contacted"
        return [
            {
                "id": UUID("33333333-3333-3333-3333-333333333333"),
                "name": "Lead One",
                "email": "lead1@example.com",
                "phone": "+34123456789",
                "status": "contacted",
                "created_at": datetime(2026, 4, 14, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 4, 14, 12, 5, tzinfo=timezone.utc),
                "questionnaire_responses": {"pets": "yes"},
                "top_matches": [{"animal_id": "dog-1", "score": 0.9}],
                "scores": {"compatibility": 0.9},
            }
        ]

    monkeypatch.setattr(leads_api.leads_service, "list_leads", _fake_list_leads)
    client = TestClient(_build_app())

    response = client.get("/api/v1/admin/leads?status=contacted", headers=_admin_headers())

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    item = payload[0]
    assert item["status"] == "contacted"
    assert "questionnaire_responses" not in item
    assert "top_matches" not in item
    assert "scores" not in item


def test_admin_detail_same_tenant_returns_full_payload(monkeypatch):
    lead_id = UUID("44444444-4444-4444-4444-444444444444")

    def _fake_get_lead(_db, requested_id, tenant_id):
        assert requested_id == lead_id
        assert tenant_id == TENANT_ID
        return _lead_detail_payload(lead_id, status="new", compatibility=0.88, animal_id="cat-1")

    monkeypatch.setattr(leads_api.leads_service, "get_lead", _fake_get_lead)
    client = TestClient(_build_app())

    response = client.get(f"/api/v1/admin/leads/{lead_id}", headers=_admin_headers())

    assert response.status_code == 200
    payload = response.json()
    assert payload["questionnaire_responses"] == {"children": "no"}
    assert payload["top_matches"][0]["animal_id"] == "cat-1"
    assert payload["scores"]["compatibility"] == 0.88


def test_admin_detail_cross_tenant_access_returns_404(monkeypatch):
    lead_id = UUID("55555555-5555-5555-5555-555555555555")

    def _fake_get_lead(_db, requested_id, tenant_id):
        assert requested_id == lead_id
        assert tenant_id == TENANT_ID
        raise HTTPException(status_code=404, detail="Lead no trobat")

    monkeypatch.setattr(leads_api.leads_service, "get_lead", _fake_get_lead)
    client = TestClient(_build_app())

    response = client.get(f"/api/v1/admin/leads/{lead_id}", headers=_admin_headers())

    assert response.status_code == 404


def test_admin_status_patch_updates_status_and_rejects_invalid_enum(monkeypatch):
    lead_id = UUID("66666666-6666-6666-6666-666666666666")
    call_count = {"update": 0}

    def _fake_update(_db, requested_id, status_data, tenant_id):
        call_count["update"] += 1
        assert requested_id == lead_id
        assert tenant_id == TENANT_ID
        assert status_data.status == "adopted"
        payload = _lead_detail_payload(lead_id, status="adopted", compatibility=0.95, animal_id="dog-2")
        payload["name"] = "Lead Status"
        payload["email"] = "status@example.com"
        payload["phone"] = "+34111111111"
        payload["questionnaire_responses"] = {"space": "large"}
        payload["created_at"] = datetime(2026, 4, 14, 11, 0, tzinfo=timezone.utc)
        payload["updated_at"] = datetime(2026, 4, 14, 11, 30, tzinfo=timezone.utc)
        return payload

    monkeypatch.setattr(leads_api.leads_service, "update_lead_status", _fake_update)
    client = TestClient(_build_app())

    ok_response = client.patch(
        f"/api/v1/admin/leads/{lead_id}",
        headers=_admin_headers(),
        json={"status": "adopted"},
    )

    assert ok_response.status_code == 200
    assert ok_response.json()["status"] == "adopted"
    assert call_count["update"] == 1

    bad_response = client.patch(
        f"/api/v1/admin/leads/{lead_id}",
        headers=_admin_headers(),
        json={"status": "bad-status"},
    )

    assert bad_response.status_code == 422
    assert call_count["update"] == 1
