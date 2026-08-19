"""Add profit wallet to wallet transactions

Revision ID: e6f4c1a52b83
Revises: c4e2a8d31f57
Create Date: 2026-08-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f4c1a52b83'
down_revision: Union[str, None] = 'c4e2a8d31f57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'wallet_transactions',
        sa.Column('profit_wallet_account_id', sa.UUID(), nullable=True),
    )
    op.create_index(
        op.f('ix_wallet_transactions_profit_wallet_account_id'),
        'wallet_transactions',
        ['profit_wallet_account_id'],
        unique=False,
    )
    op.create_foreign_key(
        'fk_wallet_transactions_profit_wallet_account_id',
        'wallet_transactions',
        'wallet_accounts',
        ['profit_wallet_account_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_wallet_transactions_profit_wallet_account_id',
        'wallet_transactions',
        type_='foreignkey',
    )
    op.drop_index(
        op.f('ix_wallet_transactions_profit_wallet_account_id'),
        table_name='wallet_transactions',
    )
    op.drop_column('wallet_transactions', 'profit_wallet_account_id')
