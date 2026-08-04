from datetime import date, datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel


class MetricCards(BaseModel):
    period_profit: Decimal
    period_exchange_profit: Decimal
    period_transaction_profit: Decimal
    period_transactions_count: int
    thb_inventory: Decimal
    outstanding_credit: Decimal
    active_buy_rate: Decimal
    active_sell_rate: Decimal


class DailyProfitPoint(BaseModel):
    date: str
    profit: Decimal


class WalletUsagePoint(BaseModel):
    wallet_type: str
    amount: Decimal


class CurrencyExchangePoint(BaseModel):
    date: str
    thb_bought: Decimal
    thb_sold: Decimal


class DashboardCharts(BaseModel):
    daily_profit: List[DailyProfitPoint]
    wallet_usage: List[WalletUsagePoint]
    currency_exchange: List[CurrencyExchangePoint]


class RecentTransactionItem(BaseModel):
    id: str
    type: str  # "WALLET", "THB_BUY", "THB_SELL", "CREDIT_PAYMENT"
    description: str
    amount: Decimal
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    cards: MetricCards
    charts: DashboardCharts
    recent_transactions: List[RecentTransactionItem]
