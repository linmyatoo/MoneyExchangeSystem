from typing import Dict, Any

from sqlalchemy.orm import Session

from app.repositories.dashboard_repository import DashboardRepository


class DashboardService:
    def __init__(self, db: Session):
        self.repo = DashboardRepository(db)

    def get_dashboard_summary(self, period: str = "daily") -> Dict[str, Any]:
        rates = self.repo.get_active_rates()
        
        profit_data = self.repo.get_profit_summary(period)
        
        cards = {
            "period_profit": profit_data["total"],
            "period_exchange_profit": profit_data["exchange_profit"],
            "period_transaction_profit": profit_data["transaction_profit"],
            "period_transactions_count": self.repo.get_transaction_count(period),
            "thb_inventory": self.repo.get_thb_inventory(),
            "mmk_inventory": self.repo.get_mmk_inventory(),
            "outstanding_credit": self.repo.get_outstanding_credit(),
            "active_buy_rate": rates["buy"],
            "active_sell_rate": rates["sell"],
        }
        
        charts = {
            "daily_profit": self.repo.get_daily_profit_chart(period),
            "wallet_usage": self.repo.get_wallet_usage_chart(period),
            "currency_exchange": self.repo.get_currency_exchange_chart(period),
        }
        
        recent_transactions = self.repo.get_recent_transactions()
        
        return {
            "cards": cards,
            "charts": charts,
            "recent_transactions": recent_transactions
        }
