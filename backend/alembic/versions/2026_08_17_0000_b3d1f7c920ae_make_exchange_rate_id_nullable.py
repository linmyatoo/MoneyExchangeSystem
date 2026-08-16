"""make exchange_rate_id nullable on currency transactions

The buy/sell forms carry their own rate, so the service writes
exchange_rate_id = None and never looks up an ExchangeRate row. The models
have declared the column Optional since that change, but the initial schema
created it NOT NULL and nothing ever reconciled the two — so every buy and
sell failed on a NotNullViolation against a database built from migrations.

Revision ID: b3d1f7c920ae
Revises: 09415a616624
Create Date: 2026-08-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b3d1f7c920ae'
down_revision: Union[str, None] = '09415a616624'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'currency_buy_transactions',
        'exchange_rate_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.alter_column(
        'currency_sell_transactions',
        'exchange_rate_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    # Rows written after the upgrade have a NULL here, so restoring NOT NULL
    # would fail against real data. Clear them first — there is no rate row to
    # point them back at.
    op.execute(
        "DELETE FROM currency_buy_transactions WHERE exchange_rate_id IS NULL"
    )
    op.execute(
        "DELETE FROM currency_sell_transactions WHERE exchange_rate_id IS NULL"
    )
    op.alter_column(
        'currency_sell_transactions',
        'exchange_rate_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        'currency_buy_transactions',
        'exchange_rate_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
