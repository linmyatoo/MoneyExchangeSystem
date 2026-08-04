from datetime import date
from decimal import Decimal
from typing import List

from pydantic import BaseModel


class ProfitReportItem(BaseModel):
    date: date
    exchange_profit: Decimal
    transaction_profit: Decimal
    total_profit: Decimal


class WalletBalanceReportItem(BaseModel):
    wallet_id: str
    wallet_name: str
    wallet_type: str
    current_balance: Decimal


class CashFlowReportItem(BaseModel):
    date: date
    inflow: Decimal
    outflow: Decimal
    net_flow: Decimal


class ReportResponseBase(BaseModel):
    start_date: date
    end_date: date
    total_records: int


class ProfitReportResponse(ReportResponseBase):
    items: List[ProfitReportItem]
    total_exchange_profit: Decimal
    total_transaction_profit: Decimal
    overall_profit: Decimal


class WalletBalanceReportResponse(ReportResponseBase):
    items: List[WalletBalanceReportItem]


class CashFlowReportResponse(ReportResponseBase):
    items: List[CashFlowReportItem]
    total_inflow: Decimal
    total_outflow: Decimal
    overall_net: Decimal
