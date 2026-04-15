"""lead contact contract

Revision ID: 06_lead_contact_contract
Revises: 05_lead_status_contract
Create Date: 2026-04-15 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "06_lead_contact_contract"
down_revision: Union[str, None] = "05_lead_status_contract"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("leads", "email", existing_type=sa.String(length=255), nullable=True)
    op.create_check_constraint(
        "ck_leads_contact_required",
        "leads",
        "email IS NOT NULL OR phone IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leads_contact_required", "leads", type_="check")
    op.execute(
        sa.text(
            """
            UPDATE leads
            SET email = 'unknown@example.com'
            WHERE email IS NULL
            """
        )
    )
    op.alter_column("leads", "email", existing_type=sa.String(length=255), nullable=False)
