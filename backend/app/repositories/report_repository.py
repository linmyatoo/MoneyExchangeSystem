from datetime import date, datetime, time
from typing import List, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.wallet_account import WalletAccount
from app.models.wallet_type import WalletType
from app.models.wallet_transaction import WalletTransaction
from app.models.currency_sell_transaction import CurrencySellTransaction


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_profit_report(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        # For SQLite/PostgreSQL compatibility across standard SQLAlchemy, 
        # grouping by date can sometimes require cast.
        from sqlalchemy import cast, Date
        
        start_dt = datetime.combine(start_date, time.min)
        end_dt = datetime.combine(end_date, time.max)
        
        # 1. Wallet Transaction Profit
        tx_q = self.db.query(
            cast(WalletTransaction.transaction_date, Date).label("dt"),
            func.sum(WalletTransaction.profit).label("transaction_profit")
        ).filter(
            WalletTransaction.transaction_date.between(start_dt, end_dt),
            WalletTransaction.deleted_at.is_(None)
        ).group_by(cast(WalletTransaction.transaction_date, Date)).all()
        
        # 2. Currency Sell Profit
        exch_q = self.db.query(
            cast(CurrencySellTransaction.transaction_date, Date).label("dt"),
            func.sum(CurrencySellTransaction.profit).label("exchange_profit")
        ).filter(
            CurrencySellTransaction.transaction_date.between(start_dt, end_dt),
            CurrencySellTransaction.deleted_at.is_(None)
        ).group_by(cast(CurrencySellTransaction.transaction_date, Date)).all()

        # Merge them by date
        merged = {}
        for row in tx_q:
            dt = row.dt
            merged[dt] = {"date": dt, "transaction_profit": row.transaction_profit or 0, "exchange_profit": 0, "total_profit": row.transaction_profit or 0}
            
        for row in exch_q:
            dt = row.dt
            if dt not in merged:
                merged[dt] = {"date": dt, "transaction_profit": 0, "exchange_profit": row.exchange_profit or 0, "total_profit": row.exchange_profit or 0}
            else:
                merged[dt]["exchange_profit"] = row.exchange_profit or 0
                merged[dt]["total_profit"] += row.exchange_profit or 0

        # Sort by date
        sorted_results = sorted(merged.values(), key=lambda x: x["date"])
        return sorted_results

    def get_wallet_balances_report(self) -> List[Dict[str, Any]]:
        wallets = self.db.query(
            WalletAccount.id,
            WalletAccount.account_name,
            WalletType.name.label("wallet_type"),
            WalletAccount.balance
        ).join(WalletType).filter(
            WalletAccount.deleted_at.is_(None)
        ).order_by(WalletType.name, WalletAccount.account_name).all()

        return [
            {
                "wallet_id": str(w.id),
                "wallet_name": w.account_name,
                "wallet_type": w.wallet_type,
                "current_balance": w.balance
            }
            for w in wallets
        ]

    def get_cash_flow_report(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        from sqlalchemy import cast, Date
        start_dt = datetime.combine(start_date, time.min)
        end_dt = datetime.combine(end_date, time.max)
        
        # Inflows (To Wallet)
        inflow_q = self.db.query(
            cast(WalletTransaction.transaction_date, Date).label("dt"),
            func.sum(WalletTransaction.amount).label("inflow")
        ).filter(
            WalletTransaction.transaction_date.between(start_dt, end_dt),
            WalletTransaction.to_wallet_account_id.isnot(None),
            WalletTransaction.deleted_at.is_(None)
        ).group_by(cast(WalletTransaction.transaction_date, Date)).all()
        
        # Outflows (From Wallet)
        outflow_q = self.db.query(
            cast(WalletTransaction.transaction_date, Date).label("dt"),
            func.sum(WalletTransaction.amount).label("outflow")
        ).filter(
            WalletTransaction.transaction_date.between(start_dt, end_dt),
            WalletTransaction.from_wallet_account_id.isnot(None),
            WalletTransaction.deleted_at.is_(None)
        ).group_by(cast(WalletTransaction.transaction_date, Date)).all()

        merged = {}
        for row in inflow_q:
            dt = row.dt
            merged[dt] = {"date": dt, "inflow": row.inflow or 0, "outflow": 0, "net_flow": row.inflow or 0}
            
        for row in outflow_q:
            dt = row.dt
            if dt not in merged:
                merged[dt] = {"date": dt, "inflow": 0, "outflow": row.outflow or 0, "net_flow": -(row.outflow or 0)}
            else:
                merged[dt]["outflow"] = row.outflow or 0
                merged[dt]["net_flow"] -= row.outflow or 0

        sorted_results = sorted(merged.values(), key=lambda x: x["date"])
        return sorted_results
