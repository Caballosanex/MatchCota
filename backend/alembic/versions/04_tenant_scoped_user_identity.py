"""tenant scoped user identity uniqueness

Revision ID: 04_tenant_scoped_user_identity
Revises: fafb12bebcd4
Create Date: 2026-04-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "04_tenant_scoped_user_identity"
down_revision: Union[str, None] = "fafb12bebcd4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("users_username_key", "users", type_="unique")
    op.create_unique_constraint(
        "uq_users_tenant_id_email",
        "users",
        ["tenant_id", "email"],
    )
    op.create_unique_constraint(
        "uq_users_tenant_id_username",
        "users",
        ["tenant_id", "username"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_users_tenant_id_username", "users", type_="unique")
    op.drop_constraint("uq_users_tenant_id_email", "users", type_="unique")
    op.create_unique_constraint("users_username_key", "users", ["username"])
