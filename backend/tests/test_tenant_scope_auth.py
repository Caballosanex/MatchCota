import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models.user import User
from app.crud import users as crud_users


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


class _DummyColumn:
    def __init__(self, name: str):
        self.name = name

    def __eq__(self, _other):
        return _DummyExpression("eq", self.name)


class _DummyExpression:
    def __init__(self, op: str, field: str):
        self.op = op
        self.field = field

    def __or__(self, other):
        return _DummyExpression("or", f"{self.field}|{other.field}")

    def __eq__(self, other):
        return (
            isinstance(other, _DummyExpression)
            and self.op == other.op
            and self.field == other.field
        )

    def __repr__(self):
        return f"Expr({self.op},{self.field})"


class _DummyUserModel:
    email = _DummyColumn("email")
    username = _DummyColumn("username")
    tenant_id = _DummyColumn("tenant_id")


class _DummyQuery:
    def __init__(self):
        self.filters = []

    def filter(self, *criteria):
        self.filters.extend(criteria)
        return self

    def first(self):
        return None


class _DummySession:
    def __init__(self):
        self.query_calls = []
        self.last_query = None

    def query(self, model):
        self.query_calls.append(model)
        query = _DummyQuery()
        self.last_query = query
        return query


def test_crud_identity_lookup_functions_require_tenant_id_argument():
    tenant_id = "tenant-a"
    db = _DummySession()

    original_user_model = crud_users.User
    crud_users.User = _DummyUserModel

    try:
        crud_users.get_user_by_email(db, "user@example.com", tenant_id)
        email_filters = db.last_query.filters

        crud_users.get_user_by_username(db, "username", tenant_id)
        username_filters = db.last_query.filters

        crud_users.check_existing_user(db, "username", "user@example.com", tenant_id)
        existing_filters = db.last_query.filters
    finally:
        crud_users.User = original_user_model

    assert _DummyExpression("eq", "tenant_id") in email_filters
    assert _DummyExpression("eq", "email") in email_filters

    assert _DummyExpression("eq", "tenant_id") in username_filters
    assert _DummyExpression("eq", "username") in username_filters

    assert _DummyExpression("eq", "tenant_id") in existing_filters


def test_auth_module_uses_tenant_scoped_current_user_query_and_login_query():
    auth_file = PROJECT_ROOT / "app/api/v1/auth.py"
    auth_content = auth_file.read_text(encoding="utf-8")

    assert "User.id == user_id" in auth_content
    assert "User.tenant_id == header_tenant_id" in auth_content
    assert "User.email == form_data.username," in auth_content
    assert "User.tenant_id == tenant.id" in auth_content


def test_production_auth_has_explicit_mismatch_deny_contract_branch():
    auth_file = PROJECT_ROOT / "app/api/v1/auth.py"
    auth_content = auth_file.read_text(encoding="utf-8")

    assert "resolve_tenant_slug_for_request" in auth_content
    assert "LOGIN-HOST_HINT_MISMATCH" in auth_content
    assert '"handoff_status": "tenant_mismatch"' in auth_content


def test_tenants_current_uses_host_authority_resolver_contract():
    tenants_file = PROJECT_ROOT / "app/api/v1/tenants.py"
    tenants_content = tenants_file.read_text(encoding="utf-8")

    assert "resolve_tenant_slug_for_request" in tenants_content
    assert "CONTEXT-TENANT_MISSING" in tenants_content
    assert "CONTEXT-TENANT_NOT_FOUND" in tenants_content
