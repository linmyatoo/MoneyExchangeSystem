"""drop cash register tables

The cash register feature (daily open/close with physical count reconciliation)
was removed: the dashboard page, its API client, and the backend
api/service/repository/schemas/models are all gone. These two tables are the
last thing left behind, and nothing else in the schema references them.

Revision ID: c4e2a8d31f57
Revises: b3d1f7c920ae
Create Date: 2026-08-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c4e2a8d31f57'
down_revision: Union[str, None] = 'b3d1f7c920ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('cash_closings')
    op.drop_table('cash_openings')


def downgrade() -> None:
    op.create_table(
        'cash_openings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('opening_date', sa.Date(), nullable=False),
        sa.Column('mmk_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('thb_amount', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'open'")),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.UniqueConstraint('opening_date'),
    )
    op.create_index('ix_cash_openings_opening_date', 'cash_openings', ['opening_date'])
    op.create_index('ix_cash_openings_status', 'cash_openings', ['status'])
    op.create_index('ix_cash_openings_created_by', 'cash_openings', ['created_by'])
    op.create_index('ix_cash_openings_deleted_at', 'cash_openings', ['deleted_at'])

    op.create_table(
        'cash_closings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('closing_date', sa.Date(), nullable=False),
        sa.Column('mmk_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('thb_amount', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('expected_mmk_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('expected_thb_amount', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('mmk_discrepancy', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('thb_discrepancy', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('cash_opening_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['cash_opening_id'], ['cash_openings.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.UniqueConstraint('cash_opening_id'),
    )
    op.create_index('ix_cash_closings_closing_date', 'cash_closings', ['closing_date'])
    op.create_index('ix_cash_closings_cash_opening_id', 'cash_closings', ['cash_opening_id'])
    op.create_index('ix_cash_closings_created_by', 'cash_closings', ['created_by'])
    op.create_index('ix_cash_closings_deleted_at', 'cash_closings', ['deleted_at'])
