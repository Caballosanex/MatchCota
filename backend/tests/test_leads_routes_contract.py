import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def test_leads_router_file_exists():
    leads_path = PROJECT_ROOT / "app/api/v1/leads.py"
    assert leads_path.exists(), "Expected leads API router file to exist"


def test_leads_router_contains_required_route_contracts():
    leads_path = PROJECT_ROOT / "app/api/v1/leads.py"
    content = leads_path.read_text(encoding="utf-8")

    assert '@router.post("/leads"' in content
    assert '@router.get("/admin/leads"' in content
    assert '@router.get("/admin/leads/{lead_id}"' in content
    assert '@router.patch("/admin/leads/{lead_id}"' in content

    assert "LeadCreateReceipt" in content
    assert "List[LeadListItem]" in content
    assert "LeadDetail" in content
    assert "LeadStatusUpdate" in content

    assert "current_user: User = Depends(get_current_user)" in content
    assert "tenant: Tenant = Depends(get_current_tenant)" in content
    assert "skip: int = Query(0, ge=0)" in content
    assert "limit: int = Query(20, ge=1, le=100)" in content
