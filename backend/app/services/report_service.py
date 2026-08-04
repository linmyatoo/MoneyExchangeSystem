from datetime import date
from decimal import Decimal
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.repositories.report_repository import ReportRepository


class ReportService:
    def __init__(self, db: Session):
        self.repo = ReportRepository(db)

    def generate_profit_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        items = self.repo.get_profit_report(start_date, end_date)
        
        total_exchange = sum((item["exchange_profit"] for item in items), Decimal("0.00"))
        total_tx = sum((item["transaction_profit"] for item in items), Decimal("0.00"))
        overall = sum((item["total_profit"] for item in items), Decimal("0.00"))
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_records": len(items),
            "items": items,
            "total_exchange_profit": total_exchange,
            "total_transaction_profit": total_tx,
            "overall_profit": overall
        }

    def generate_wallet_balances_report(self) -> Dict[str, Any]:
        items = self.repo.get_wallet_balances_report()
        # For wallet balance report, dates reflect the exact snapshot moment
        today = date.today()
        return {
            "start_date": today,
            "end_date": today,
            "total_records": len(items),
            "items": items
        }

    def generate_cash_flow_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        items = self.repo.get_cash_flow_report(start_date, end_date)
        
        total_inflow = sum((item["inflow"] for item in items), Decimal("0.00"))
        total_outflow = sum((item["outflow"] for item in items), Decimal("0.00"))
        overall_net = sum((item["net_flow"] for item in items), Decimal("0.00"))
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_records": len(items),
            "items": items,
            "total_inflow": total_inflow,
            "total_outflow": total_outflow,
            "overall_net": overall_net
        }
