from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.wallet_account import WalletAccount
from app.models.wallet_type import WalletType
from app.models.wallet_transaction import WalletTransaction
from app.models.currency_buy_transaction import CurrencyBuyTransaction
from app.models.currency_sell_transaction import CurrencySellTransaction
from app.models.credit import Credit
from app.models.exchange_rate import ExchangeRate


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def _get_date_range(self, period: str) -> tuple[datetime, datetime]:
        today = date.today()
        if period == "monthly":
            start_date = today.replace(day=1)
            end_date = today
        elif period == "yearly":
            start_date = today.replace(month=1, day=1)
            end_date = today
        else: # daily or default
            start_date = today
            end_date = today
            
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(end_date, time.max).replace(tzinfo=timezone.utc)
        return start_dt, end_dt

    def get_profit_summary(self, period: str = "daily") -> dict:
        start_dt, end_dt = self._get_date_range(period)
        
        fee_profit = self.db.query(func.sum(WalletTransaction.profit)).filter(
            WalletTransaction.transaction_date.between(start_dt, end_dt),
            WalletTransaction.deleted_at.is_(None)
        ).scalar() or 0.0

        exchange_profit = self.db.query(func.sum(CurrencySellTransaction.profit)).filter(
            CurrencySellTransaction.transaction_date.between(start_dt, end_dt),
            CurrencySellTransaction.deleted_at.is_(None)
        ).scalar() or 0.0

        return {
            "total": float(fee_profit) + float(exchange_profit),
            "transaction_profit": float(fee_profit),
            "exchange_profit": float(exchange_profit)
        }

    def get_transaction_count(self, period: str = "daily") -> int:
        start_dt, end_dt = self._get_date_range(period)
        
        wallet_count = self.db.query(WalletTransaction).filter(
            WalletTransaction.transaction_date.between(start_dt, end_dt),
            WalletTransaction.deleted_at.is_(None)
        ).count()

        buy_count = self.db.query(CurrencyBuyTransaction).filter(
            CurrencyBuyTransaction.transaction_date.between(start_dt, end_dt),
            CurrencyBuyTransaction.deleted_at.is_(None)
        ).count()

        sell_count = self.db.query(CurrencySellTransaction).filter(
            CurrencySellTransaction.transaction_date.between(start_dt, end_dt),
            CurrencySellTransaction.deleted_at.is_(None)
        ).count()

        return wallet_count + buy_count + sell_count

    def get_thb_inventory(self) -> float:
        thai_bank_types = ['Thai Bank', 'KBank', 'BBL', 'SCB', 'KTB', 'TTB', 'CIMBT', 'BAY', 'LHBank', 'KKP', 'UOBT']
        thb_balance = self.db.query(func.sum(WalletAccount.balance)).join(WalletType).filter(
            WalletType.name.in_(thai_bank_types),
            WalletAccount.deleted_at.is_(None)
        ).scalar() or 0.0
        return float(thb_balance)

    def get_mmk_inventory(self) -> float:
        mmk_bank_types = ['KPay', 'WavePay', 'AYAPay', 'CB Pay', 'KBZ Bank', 'AYA Bank', 'YOMA Bank', 'CB Bank', 'MAB Bank', 'Cash']
        mmk_balance = self.db.query(func.sum(WalletAccount.balance)).join(WalletType).filter(
            WalletType.name.in_(mmk_bank_types),
            WalletAccount.deleted_at.is_(None)
        ).scalar() or 0.0
        return float(mmk_balance)

    def get_outstanding_credit(self) -> float:
        outstanding = self.db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.is_credit == True,
            WalletTransaction.deleted_at.is_(None)
        ).scalar() or 0.0
        return float(outstanding)

    def get_active_rates(self) -> Dict[str, float]:
        rate = self.db.query(ExchangeRate).filter(
            ExchangeRate.currency_code == "THB",
            ExchangeRate.is_active == True,
            ExchangeRate.deleted_at.is_(None)
        ).first()
        
        if rate:
            return {"buy": float(rate.buy_rate), "sell": float(rate.sell_rate)}
        return {"buy": 0.0, "sell": 0.0}

    def get_daily_profit_chart(self, period: str = "daily") -> List[Dict[str, Any]]:
        from sqlalchemy import cast, Date
        today = date.today()
        if period == "monthly":
            start_date = today.replace(day=1)
        elif period == "yearly":
            start_date = today.replace(month=1, day=1)
        else:
            start_date = today - timedelta(days=6)
        end_date = today
        
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(end_date, time.max).replace(tzinfo=timezone.utc)
        
        fee_q = self.db.query(
            cast(WalletTransaction.transaction_date, Date).label("dt"),
            func.sum(WalletTransaction.profit).label("val")
        ).filter(
            WalletTransaction.transaction_date.between(start_dt, end_dt),
            WalletTransaction.deleted_at.is_(None)
        ).group_by(cast(WalletTransaction.transaction_date, Date)).all()

        exch_q = self.db.query(
            cast(CurrencySellTransaction.transaction_date, Date).label("dt"),
            func.sum(CurrencySellTransaction.profit).label("val")
        ).filter(
            CurrencySellTransaction.transaction_date.between(start_dt, end_dt),
            CurrencySellTransaction.deleted_at.is_(None)
        ).group_by(cast(CurrencySellTransaction.transaction_date, Date)).all()

        # Build dict of dates
        days = (end_date - start_date).days + 1
        chart_data = { (start_date + timedelta(days=i)).isoformat(): 0.0 for i in range(days) }

        for row in fee_q:
            dt_str = row.dt.isoformat()
            if dt_str in chart_data:
                chart_data[dt_str] += float(row.val or 0)
                
        for row in exch_q:
            dt_str = row.dt.isoformat()
            if dt_str in chart_data:
                chart_data[dt_str] += float(row.val or 0)

        return [{"date": k, "profit": v} for k, v in chart_data.items()]

    def get_wallet_usage_chart(self, period: str = "daily") -> List[Dict[str, Any]]:
        # Volume by wallet type for the period
        today = date.today()
        if period == "monthly":
            start_date = today.replace(day=1)
        elif period == "yearly":
            start_date = today.replace(month=1, day=1)
        else:
            start_date = today - timedelta(days=30)
            
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
        
        # We look at the 'to_wallet' type to determine where money is flowing
        q = self.db.query(
            WalletType.name,
            func.sum(WalletTransaction.amount).label("vol")
        ).join(
            WalletAccount, WalletTransaction.to_wallet_account_id == WalletAccount.id
        ).join(
            WalletType, WalletAccount.wallet_type_id == WalletType.id
        ).filter(
            WalletTransaction.transaction_date >= start_dt,
            WalletTransaction.deleted_at.is_(None)
        ).group_by(WalletType.name).all()
        
        return [{"wallet_type": row.name, "amount": float(row.vol or 0)} for row in q]

    def get_currency_exchange_chart(self, period: str = "daily") -> List[Dict[str, Any]]:
        # Buy vs Sell Volume
        from sqlalchemy import cast, Date
        today = date.today()
        if period == "monthly":
            start_date = today.replace(day=1)
        elif period == "yearly":
            start_date = today.replace(month=1, day=1)
        else:
            start_date = today - timedelta(days=6)
        end_date = today
        
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(end_date, time.max).replace(tzinfo=timezone.utc)
        
        buy_q = self.db.query(
            cast(CurrencyBuyTransaction.transaction_date, Date).label("dt"),
            func.sum(CurrencyBuyTransaction.foreign_amount).label("vol")
        ).filter(
            CurrencyBuyTransaction.transaction_date.between(start_dt, end_dt),
            CurrencyBuyTransaction.deleted_at.is_(None)
        ).group_by(cast(CurrencyBuyTransaction.transaction_date, Date)).all()

        sell_q = self.db.query(
            cast(CurrencySellTransaction.transaction_date, Date).label("dt"),
            func.sum(CurrencySellTransaction.foreign_amount).label("vol")
        ).filter(
            CurrencySellTransaction.transaction_date.between(start_dt, end_dt),
            CurrencySellTransaction.deleted_at.is_(None)
        ).group_by(cast(CurrencySellTransaction.transaction_date, Date)).all()

        days = (end_date - start_date).days + 1
        chart_data = { (start_date + timedelta(days=i)).isoformat(): {"thb_bought": 0.0, "thb_sold": 0.0} for i in range(days) }
        
        for row in buy_q:
            dt_str = row.dt.isoformat()
            if dt_str in chart_data:
                chart_data[dt_str]["thb_bought"] += float(row.vol or 0)
                
        for row in sell_q:
            dt_str = row.dt.isoformat()
            if dt_str in chart_data:
                chart_data[dt_str]["thb_sold"] += float(row.vol or 0)
                
        return [{"date": k, "thb_bought": v["thb_bought"], "thb_sold": v["thb_sold"]} for k, v in chart_data.items()]

    def get_recent_transactions(self) -> List[Dict[str, Any]]:
        # Fetch top 3 from each, sort by date, return top 5
        wallets = self.db.query(WalletTransaction).order_by(WalletTransaction.created_at.desc()).limit(3).all()
        buys = self.db.query(CurrencyBuyTransaction).order_by(CurrencyBuyTransaction.created_at.desc()).limit(3).all()
        sells = self.db.query(CurrencySellTransaction).order_by(CurrencySellTransaction.created_at.desc()).limit(3).all()
        
        items = []
        for w in wallets:
            items.append({
                "id": str(w.id),
                "type": "WALLET",
                "description": f"Wallet Transfer: {w.transaction_number}",
                "amount": float(w.amount),
                "created_at": w.created_at
            })
        for b in buys:
            items.append({
                "id": str(b.id),
                "type": "THB_BUY",
                "description": f"Bought THB: {b.transaction_number}",
                "amount": float(b.foreign_amount),
                "created_at": b.created_at
            })
        for s in sells:
            items.append({
                "id": str(s.id),
                "type": "THB_SELL",
                "description": f"Sold THB: {s.transaction_number}",
                "amount": float(s.foreign_amount),
                "created_at": s.created_at
            })
            
        items.sort(key=lambda x: x["created_at"], reverse=True)
        return items[:5]
