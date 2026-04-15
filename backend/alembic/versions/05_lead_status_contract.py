"""lead status contract

Revision ID: 05_lead_status_contract
Revises: 04_tenant_scoped_user_identity
Create Date: 2026-04-15 16:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "05_lead_status_contract"
down_revision: Union[str, None] = "04_tenant_scoped_user_identity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("status", sa.String(length=20), nullable=False, server_default="new"))


def downgrade() -> None:
    op.drop_column("leads", "status")
