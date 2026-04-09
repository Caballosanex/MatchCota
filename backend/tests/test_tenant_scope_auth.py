import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models.user import User


def _unique_constraint_column_sets():
    return {
        tuple(column.name for column in constraint.columns)
        for constraint in User.__table__.constraints
        if constraint.__class__.__name__ == "UniqueConstraint"
    }


def test_unique_constraints_are_tenant_scoped_for_identity_fields():
    unique_sets = _unique_constraint_column_sets()

    assert ("tenant_id", "email") in unique_sets
    assert ("tenant_id", "username") in unique_sets
    assert ("username",) not in unique_sets


def test_tenant_scope_migration_exists_with_composite_unique_constraints():
    migration_path = PROJECT_ROOT / "alembic/versions/04_tenant_scoped_user_identity.py"

    assert migration_path.exists(), "Expected tenant-scoped identity migration file to exist"

    migration_content = migration_path.read_text(encoding="utf-8")
    assert "op.drop_constraint" in migration_content
    assert "uq_users_tenant_id_email" in migration_content
    assert "uq_users_tenant_id_username" in migration_content
