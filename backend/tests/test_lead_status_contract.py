import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models.lead import Lead


def test_lead_model_has_non_nullable_status_with_new_default():
    status_column = Lead.__table__.columns.get("status")

    assert status_column is not None
    assert status_column.nullable is False
    assert str(status_column.default.arg) == "new"


def test_status_contract_migration_exists_and_enforces_default_and_downgrade():
    migration_path = PROJECT_ROOT / "alembic/versions/05_lead_status_contract.py"

    assert migration_path.exists()

    migration_content = migration_path.read_text(encoding="utf-8")
    assert "revision" in migration_content
    assert "down_revision" in migration_content
    assert "def upgrade" in migration_content
    assert "def downgrade" in migration_content
    assert "op.add_column('leads'" in migration_content or 'op.add_column("leads"' in migration_content
    assert "server_default='new'" in migration_content or 'server_default="new"' in migration_content
    assert "nullable=False" in migration_content
    assert "op.drop_column('leads', 'status')" in migration_content or 'op.drop_column("leads", "status")' in migration_content
