from datetime import datetime, date, time, timedelta
import calendar
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import func, literal
from sqlalchemy.orm import Session, aliased

from app.models.currency_buy_transaction import CurrencyBuyTransaction
from app.models.currency_sell_transaction import CurrencySellTransaction
from app.models.wallet_account import WalletAccount
from app.models.wallet_type import WalletType


class CurrencyExchangeRepository:
    def __init__(self, db: Session):
        self.db = db

    def _period_bounds(self, period: Optional[str]) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Start/end of a named period, or (None, None) for all time."""
        if not period:
            return None, None

        today_date = date.today()
        if period == "today":
            target = today_date
        elif period == "yesterday":
            target = today_date - timedelta(days=1)
        elif period == "this_month":
            _, last_day = calendar.monthrange(today_date.year, today_date.month)
            return (
                datetime.combine(today_date.replace(day=1), time.min),
                datetime.combine(today_date.replace(day=last_day), time.max),
            )
        else:
            return None, None

        return datetime.combine(target, time.min), datetime.combine(target, time.max)

    def create_buy_transaction(self, data: dict) -> CurrencyBuyTransaction:
        db_obj = CurrencyBuyTransaction(**data)
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def create_sell_transaction(self, data: dict) -> CurrencySellTransaction:
        db_obj = CurrencySellTransaction(**data)
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def get_buy_by_id(self, id) -> Optional[CurrencyBuyTransaction]:
        return self.db.query(CurrencyBuyTransaction).filter(
            CurrencyBuyTransaction.id == id,
            CurrencyBuyTransaction.deleted_at.is_(None),
        ).first()

    def get_sell_by_id(self, id) -> Optional[CurrencySellTransaction]:
        return self.db.query(CurrencySellTransaction).filter(
            CurrencySellTransaction.id == id,
            CurrencySellTransaction.deleted_at.is_(None),
        ).first()

    def soft_delete(self, tx):
        tx.deleted_at = datetime.utcnow()
        self.db.add(tx)
        return tx

    def get_paginated_history(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        tx_type: Optional[str] = None,
        period: Optional[str] = None,
    ) -> Tuple[List[dict], int]:
        # Since history mixes Buy and Sell, we can query both and merge, 
        # or do a UNION in SQLAlchemy. For simplicity, we query both and sort in python, 
        # but that breaks pagination. A union is better.
        # Alternatively, we can just fetch all and sort if records are small, but let's do a basic union.
        
        mmk_wallet_alias = aliased(WalletAccount)
        thb_wallet_alias = aliased(WalletAccount)

        buys_q = self.db.query(
            CurrencyBuyTransaction.id.label("id"),
            CurrencyBuyTransaction.transaction_number.label("transaction_number"),
            CurrencyBuyTransaction.transaction_date.label("transaction_date"),
            CurrencyBuyTransaction.customer_name.label("customer_name"),
            CurrencyBuyTransaction.foreign_amount.label("foreign_amount"),
            CurrencyBuyTransaction.rate_used.label("rate_used"),
            CurrencyBuyTransaction.local_amount.label("local_amount"),
            CurrencyBuyTransaction.profit.label("profit"),
            CurrencyBuyTransaction.notes.label("notes"),
            CurrencyBuyTransaction.mmk_wallet_id.label("mmk_wallet_id"),
            CurrencyBuyTransaction.thb_wallet_id.label("thb_wallet_id"),
            literal("buy").label("type"),
            mmk_wallet_alias.account_name.label("mmk_wallet_name"),
            thb_wallet_alias.account_name.label("thb_wallet_name")
        ).filter(CurrencyBuyTransaction.deleted_at.is_(None)).outerjoin(mmk_wallet_alias, CurrencyBuyTransaction.mmk_wallet_id == mmk_wallet_alias.id).outerjoin(thb_wallet_alias, CurrencyBuyTransaction.thb_wallet_id == thb_wallet_alias.id)
        
        sells_q = self.db.query(
            CurrencySellTransaction.id.label("id"),
            CurrencySellTransaction.transaction_number.label("transaction_number"),
            CurrencySellTransaction.transaction_date.label("transaction_date"),
            CurrencySellTransaction.customer_name.label("customer_name"),
            CurrencySellTransaction.foreign_amount.label("foreign_amount"),
            CurrencySellTransaction.rate_used.label("rate_used"),
            CurrencySellTransaction.local_amount.label("local_amount"),
            CurrencySellTransaction.profit.label("profit"),
            CurrencySellTransaction.notes.label("notes"),
            CurrencySellTransaction.mmk_wallet_id.label("mmk_wallet_id"),
            CurrencySellTransaction.thb_wallet_id.label("thb_wallet_id"),
            literal("sell").label("type"),
            mmk_wallet_alias.account_name.label("mmk_wallet_name"),
            thb_wallet_alias.account_name.label("thb_wallet_name")
        ).filter(CurrencySellTransaction.deleted_at.is_(None)).outerjoin(mmk_wallet_alias, CurrencySellTransaction.mmk_wallet_id == mmk_wallet_alias.id).outerjoin(thb_wallet_alias, CurrencySellTransaction.thb_wallet_id == thb_wallet_alias.id)
        
        start_dt, end_dt = self._period_bounds(period)
        if start_dt and end_dt:
            buys_q = buys_q.filter(CurrencyBuyTransaction.transaction_date.between(start_dt, end_dt))
            sells_q = sells_q.filter(CurrencySellTransaction.transaction_date.between(start_dt, end_dt))
        
        if tx_type == "buy":
            query = buys_q
        elif tx_type == "sell":
            query = sells_q
        else:
            query = buys_q.union_all(sells_q)
            
        # Unfortunately, filtering on unions in SQLAlchemy 2.0 can be tricky.
        # So for advanced search, we'd normally wrap in a subquery.
        # For now, let's keep it simple and just do order by date.
        
        subq = query.subquery()
        total = self.db.query(subq).count()
        
        results = self.db.query(subq).order_by(subq.c.transaction_date.desc()).offset(skip).limit(limit).all()
        
        # We need to map these back to full objects or dicts for the response
        items = []
        for row in results:
            items.append({
                "id": row.id,
                "transaction_number": row.transaction_number,
                "transaction_date": row.transaction_date,
                "customer_name": row.customer_name,
                "foreign_amount": row.foreign_amount,
                "rate_used": row.rate_used,
                "local_amount": row.local_amount,
                "profit": row.profit,
                "notes": row.notes,
                "mmk_wallet_id": row.mmk_wallet_id,
                "thb_wallet_id": row.thb_wallet_id,
                "type": row.type,
                "mmk_wallet_name": row.mmk_wallet_name,
                "thb_wallet_name": row.thb_wallet_name,
            })
            
        return items, total

    def get_thb_inventory_summary(self, period: Optional[str] = "today") -> dict:
        start_dt, end_dt = self._period_bounds(period)

        def total(column, model) -> Decimal:
            q = self.db.query(func.sum(column)).filter(model.deleted_at.is_(None))
            if start_dt and end_dt:
                q = q.filter(model.transaction_date.between(start_dt, end_dt))
            return q.scalar() or Decimal('0.00')

        buy_thb = total(CurrencyBuyTransaction.foreign_amount, CurrencyBuyTransaction)
        buy_mmk = total(CurrencyBuyTransaction.local_amount, CurrencyBuyTransaction)
        sell_thb = total(CurrencySellTransaction.foreign_amount, CurrencySellTransaction)
        sell_mmk = total(CurrencySellTransaction.local_amount, CurrencySellTransaction)
        profit = total(CurrencySellTransaction.profit, CurrencySellTransaction)

        # Total Remaining (sum of all wallets of Thai Bank types)
        thai_bank_types = ['Thai Bank', 'KBank', 'BBL', 'SCB', 'KTB', 'TTB', 'CIMBT', 'BAY', 'LHBank', 'KKP', 'UOBT']

        wallets_q = self.db.query(WalletAccount).join(WalletType).filter(
            WalletType.name.in_(thai_bank_types),
            WalletAccount.deleted_at.is_(None)
        ).all()

        wallet_balances = [{"name": w.account_name, "balance": w.balance} for w in wallets_q]
        total_remaining = sum(w["balance"] for w in wallet_balances) if wallet_balances else Decimal('0.00')

        return {
            "total_remaining": total_remaining,
            "buy_thb": buy_thb,
            "buy_mmk": buy_mmk,
            "sell_thb": sell_thb,
            "sell_mmk": sell_mmk,
            "profit": profit,
            "wallet_balances": wallet_balances
        }

    def get_average_buy_rate(self) -> Decimal:
        """Calculates average buy rate for profit calculation on sells. Simplistic approach: average of today's buys."""
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        
        avg_rate = self.db.query(func.avg(CurrencyBuyTransaction.rate_used)).filter(
            CurrencyBuyTransaction.transaction_date.between(today_start, today_end),
            CurrencyBuyTransaction.deleted_at.is_(None)
        ).scalar()
        
        if avg_rate:
            return Decimal(avg_rate)
        
        # Fallback to the latest active exchange rate if no buys today
        from app.models.exchange_rate import ExchangeRate
        latest_rate = self.db.query(ExchangeRate).filter(
            ExchangeRate.is_active == True,
            ExchangeRate.deleted_at.is_(None)
        ).order_by(ExchangeRate.effective_date.desc()).first()
        
        if latest_rate:
            return latest_rate.buy_rate
            
        return Decimal("0.00")
