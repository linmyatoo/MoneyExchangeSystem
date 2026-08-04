"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === roles ===
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_roles_deleted_at', 'roles', ['deleted_at'])

    # === users ===
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id']),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_role_id', 'users', ['role_id'])
    op.create_index('ix_users_deleted_at', 'users', ['deleted_at'])

    # === wallet_types ===
    op.create_table(
        'wallet_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_wallet_types_code', 'wallet_types', ['code'])
    op.create_index('ix_wallet_types_deleted_at', 'wallet_types', ['deleted_at'])

    # === wallet_accounts ===
    op.create_table(
        'wallet_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_name', sa.String(255), nullable=False),
        sa.Column('account_number', sa.String(100), nullable=True),
        sa.Column('balance', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('wallet_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wallet_type_id'], ['wallet_types.id']),
    )
    op.create_index('ix_wallet_accounts_wallet_type_id', 'wallet_accounts', ['wallet_type_id'])
    op.create_index('ix_wallet_accounts_deleted_at', 'wallet_accounts', ['deleted_at'])

    # === customers ===
    op.create_table(
        'customers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_customers_name', 'customers', ['name'])
    op.create_index('ix_customers_deleted_at', 'customers', ['deleted_at'])

    # === wallet_transactions ===
    op.create_table(
        'wallet_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transaction_number', sa.String(50), nullable=False),
        sa.Column('transaction_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('commission', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('profit', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('from_wallet_account_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('to_wallet_account_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['from_wallet_account_id'], ['wallet_accounts.id']),
        sa.ForeignKeyConstraint(['to_wallet_account_id'], ['wallet_accounts.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.UniqueConstraint('transaction_number'),
    )
    op.create_index('ix_wallet_transactions_transaction_number', 'wallet_transactions', ['transaction_number'])
    op.create_index('ix_wallet_transactions_transaction_date', 'wallet_transactions', ['transaction_date'])
    op.create_index('ix_wallet_transactions_transaction_type', 'wallet_transactions', ['transaction_type'])
    op.create_index('ix_wallet_transactions_from_wallet_account_id', 'wallet_transactions', ['from_wallet_account_id'])
    op.create_index('ix_wallet_transactions_to_wallet_account_id', 'wallet_transactions', ['to_wallet_account_id'])
    op.create_index('ix_wallet_transactions_created_by', 'wallet_transactions', ['created_by'])
    op.create_index('ix_wallet_transactions_deleted_at', 'wallet_transactions', ['deleted_at'])

    # === wallet_transaction_items ===
    op.create_table(
        'wallet_transaction_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('wallet_transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wallet_transaction_id'], ['wallet_transactions.id']),
    )
    op.create_index('ix_wallet_transaction_items_wallet_transaction_id', 'wallet_transaction_items', ['wallet_transaction_id'])
    op.create_index('ix_wallet_transaction_items_deleted_at', 'wallet_transaction_items', ['deleted_at'])

    # === credits ===
    op.create_table(
        'credits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('credit_type', sa.String(20), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('remaining_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )
    op.create_index('ix_credits_credit_type', 'credits', ['credit_type'])
    op.create_index('ix_credits_status', 'credits', ['status'])
    op.create_index('ix_credits_customer_id', 'credits', ['customer_id'])
    op.create_index('ix_credits_created_by', 'credits', ['created_by'])
    op.create_index('ix_credits_deleted_at', 'credits', ['deleted_at'])

    # === credit_payments ===
    op.create_table(
        'credit_payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('payment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('credit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['credit_id'], ['credits.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )
    op.create_index('ix_credit_payments_payment_date', 'credit_payments', ['payment_date'])
    op.create_index('ix_credit_payments_credit_id', 'credit_payments', ['credit_id'])
    op.create_index('ix_credit_payments_created_by', 'credit_payments', ['created_by'])
    op.create_index('ix_credit_payments_deleted_at', 'credit_payments', ['deleted_at'])

    # === exchange_rates ===
    op.create_table(
        'exchange_rates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('currency_code', sa.String(10), nullable=False),
        sa.Column('buy_rate', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('sell_rate', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )
    op.create_index('ix_exchange_rates_currency_code', 'exchange_rates', ['currency_code'])
    op.create_index('ix_exchange_rates_effective_date', 'exchange_rates', ['effective_date'])
    op.create_index('ix_exchange_rates_created_by', 'exchange_rates', ['created_by'])
    op.create_index('ix_exchange_rates_deleted_at', 'exchange_rates', ['deleted_at'])

    # === currency_buy_transactions ===
    op.create_table(
        'currency_buy_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transaction_number', sa.String(50), nullable=False),
        sa.Column('transaction_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('currency_code', sa.String(10), nullable=False),
        sa.Column('foreign_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('rate_used', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('local_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('profit', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('exchange_rate_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['exchange_rate_id'], ['exchange_rates.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.UniqueConstraint('transaction_number'),
    )
    op.create_index('ix_currency_buy_transactions_transaction_number', 'currency_buy_transactions', ['transaction_number'])
    op.create_index('ix_currency_buy_transactions_transaction_date', 'currency_buy_transactions', ['transaction_date'])
    op.create_index('ix_currency_buy_transactions_currency_code', 'currency_buy_transactions', ['currency_code'])
    op.create_index('ix_currency_buy_transactions_customer_id', 'currency_buy_transactions', ['customer_id'])
    op.create_index('ix_currency_buy_transactions_exchange_rate_id', 'currency_buy_transactions', ['exchange_rate_id'])
    op.create_index('ix_currency_buy_transactions_created_by', 'currency_buy_transactions', ['created_by'])
    op.create_index('ix_currency_buy_transactions_deleted_at', 'currency_buy_transactions', ['deleted_at'])

    # === currency_sell_transactions ===
    op.create_table(
        'currency_sell_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transaction_number', sa.String(50), nullable=False),
        sa.Column('transaction_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('currency_code', sa.String(10), nullable=False),
        sa.Column('foreign_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('rate_used', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('local_amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('profit', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('exchange_rate_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['exchange_rate_id'], ['exchange_rates.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.UniqueConstraint('transaction_number'),
    )
    op.create_index('ix_currency_sell_transactions_transaction_number', 'currency_sell_transactions', ['transaction_number'])
    op.create_index('ix_currency_sell_transactions_transaction_date', 'currency_sell_transactions', ['transaction_date'])
    op.create_index('ix_currency_sell_transactions_currency_code', 'currency_sell_transactions', ['currency_code'])
    op.create_index('ix_currency_sell_transactions_customer_id', 'currency_sell_transactions', ['customer_id'])
    op.create_index('ix_currency_sell_transactions_exchange_rate_id', 'currency_sell_transactions', ['exchange_rate_id'])
    op.create_index('ix_currency_sell_transactions_created_by', 'currency_sell_transactions', ['created_by'])
    op.create_index('ix_currency_sell_transactions_deleted_at', 'currency_sell_transactions', ['deleted_at'])

    # === cash_openings ===
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

    # === cash_closings ===
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

    # === audit_logs ===
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=False),
        sa.Column('entity_id', sa.String(50), nullable=False),
        sa.Column('old_values', postgresql.JSON(), nullable=True),
        sa.Column('new_values', postgresql.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    # === system_settings ===
    op.create_table(
        'system_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )
    op.create_index('ix_system_settings_key', 'system_settings', ['key'])


def downgrade() -> None:
    op.drop_table('system_settings')
    op.drop_table('audit_logs')
    op.drop_table('cash_closings')
    op.drop_table('cash_openings')
    op.drop_table('currency_sell_transactions')
    op.drop_table('currency_buy_transactions')
    op.drop_table('exchange_rates')
    op.drop_table('credit_payments')
    op.drop_table('credits')
    op.drop_table('wallet_transaction_items')
    op.drop_table('wallet_transactions')
    op.drop_table('customers')
    op.drop_table('wallet_accounts')
    op.drop_table('wallet_types')
    op.drop_table('users')
    op.drop_table('roles')
