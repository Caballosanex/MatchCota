import sys
from pathlib import Path

import pytest
from pydantic import ValidationError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.lead import (
    LeadCreate,
    LeadCreateReceipt,
    LeadListItem,
    LeadDetail,
    LeadStatusUpdate,
)


def test_lead_create_requires_at_least_one_contact_medium():
    with pytest.raises(ValidationError):
        LeadCreate(name="Jane", email=None, phone=None)


def test_lead_status_update_rejects_invalid_status_values():
    with pytest.raises(ValidationError):
        LeadStatusUpdate(status="archived")


def test_list_and_detail_dto_shapes_are_distinct_by_contract():
    list_fields = set(LeadListItem.model_fields.keys())
    detail_fields = set(LeadDetail.model_fields.keys())

    assert {"questionnaire_responses", "scores", "top_matches"}.isdisjoint(list_fields)
    assert {"questionnaire_responses", "scores", "top_matches"}.issubset(detail_fields)


def test_lead_schema_exports_expected_dto_names():
    for schema in [LeadCreate, LeadCreateReceipt, LeadListItem, LeadDetail, LeadStatusUpdate]:
        assert schema is not None
