import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.lead import LeadCreate, LeadStatusUpdate
from app.services import leads as lead_service


def test_service_create_normalizes_top_matches_to_compact_snapshot(monkeypatch):
    captured = {}

    def _fake_create_lead(_db, lead):
        captured["lead"] = lead
        return lead

    monkeypatch.setattr(lead_service.crud_leads, "create_lead", _fake_create_lead)

    tenant_id = uuid4()
    payload = LeadCreate(
        name="Maria",
        email="maria@example.com",
        top_matches=[
            {
                "animal_id": str(uuid4()),
                "animal_name": "Nina",
                "score": 0.93,
                "explanations": ["Calm temperament"],
                "species": "dog",
                "photo_url": "https://example.org/nina.jpg",
            }
        ],
    )

    lead_service.create_lead(db=None, lead_data=payload, tenant_id=tenant_id)

    assert captured["lead"].top_matches == [
        {
            "animal_id": payload.top_matches[0]["animal_id"],
            "animal_name": "Nina",
            "score": 0.93,
            "explanations": ["Calm temperament"],
        }
    ]


def test_service_get_and_update_raise_404_for_missing_tenant_scoped_lead(monkeypatch):
    monkeypatch.setattr(lead_service.crud_leads, "get_lead_by_tenant", lambda *_args, **_kwargs: None)

    with pytest.raises(HTTPException) as get_exc:
        lead_service.get_lead(db=None, lead_id=uuid4(), tenant_id=uuid4())
    assert get_exc.value.status_code == 404

    with pytest.raises(HTTPException) as update_exc:
        lead_service.update_lead_status(
            db=None,
            lead_id=uuid4(),
            status_update=LeadStatusUpdate(status="contacted"),
            tenant_id=uuid4(),
        )
    assert update_exc.value.status_code == 404


def test_service_update_mutates_status_only(monkeypatch):
    class _Lead:
        status = "new"
        name = "Unchanged"

    captured = {}

    def _fake_get(_db, _lead_id, _tenant_id):
        return _Lead()

    def _fake_update(_db, lead, update_data):
        captured["lead"] = lead
        captured["update_data"] = update_data
        return lead

    monkeypatch.setattr(lead_service.crud_leads, "get_lead_by_tenant", _fake_get)
    monkeypatch.setattr(lead_service.crud_leads, "update_lead", _fake_update)

    lead_service.update_lead_status(
        db=None,
        lead_id=uuid4(),
        status_update=LeadStatusUpdate(status="adopted"),
        tenant_id=uuid4(),
    )

    assert captured["update_data"] == {"status": "adopted"}


def test_crud_file_contains_tenant_scoped_lookup_contract():
    crud_path = PROJECT_ROOT / "app/crud/leads.py"
    content = crud_path.read_text(encoding="utf-8")

    assert "Lead.id == lead_id" in content
    assert "Lead.tenant_id == tenant_id" in content
