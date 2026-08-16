import uuid
import calendar
from datetime import datetime, date, time, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.wallet_transaction import WalletTransaction
from app.repositories.base import BaseRepository


class WalletTransactionRepository(BaseRepository[WalletTransaction]):
    def __init__(self, db: Session):
        super().__init__(WalletTransaction, db)

    def get_paginated_transactions(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        wallet_account_id: Optional[uuid.UUID] = None,
        customer_id: Optional[uuid.UUID] = None,
        is_credit: Optional[bool] = None,
        period: Optional[str] = None,
        transaction_type: Optional[str] = None,
    ) -> Tuple[List[WalletTransaction], int]:
        query = self.db.query(WalletTransaction).filter(WalletTransaction.deleted_at.is_(None))

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    WalletTransaction.transaction_number.ilike(search_term),
                    WalletTransaction.notes.ilike(search_term),
                )
            )

        if transaction_type:
            query = query.filter(WalletTransaction.transaction_type == transaction_type)

        if wallet_account_id:
            query = query.filter(
                or_(
                    WalletTransaction.from_wallet_account_id == wallet_account_id,
                    WalletTransaction.to_wallet_account_id == wallet_account_id,
                )
            )

        if customer_id:
            query = query.filter(WalletTransaction.customer_id == customer_id)

        if is_credit is not None:
            query = query.filter(WalletTransaction.is_credit == is_credit)

        if period:
            today_date = date.today()
            if period == "today":
                start_dt = datetime.combine(today_date, time.min)
                end_dt = datetime.combine(today_date, time.max)
            elif period == "yesterday":
                yesterday_date = today_date - timedelta(days=1)
                start_dt = datetime.combine(yesterday_date, time.min)
                end_dt = datetime.combine(yesterday_date, time.max)
            elif period == "this_month":
                start_dt = datetime.combine(today_date.replace(day=1), time.min)
                _, last_day = calendar.monthrange(today_date.year, today_date.month)
                end_dt = datetime.combine(today_date.replace(day=last_day), time.max)
            else:
                try:
                    target_date = datetime.strptime(period, "%Y-%m-%d").date()
                    start_dt = datetime.combine(target_date, time.min)
                    end_dt = datetime.combine(target_date, time.max)
                except ValueError:
                    start_dt = None
                    end_dt = None
                
            if start_dt and end_dt:
                query = query.filter(WalletTransaction.transaction_date.between(start_dt, end_dt))

        total = query.count()
        items = query.order_by(WalletTransaction.transaction_date.desc()).offset(skip).limit(limit).all()

        return items, total

    def get_latest_transaction_number(self, prefix: str) -> Optional[str]:
        latest = (
            self.db.query(WalletTransaction)
            .filter(WalletTransaction.transaction_number.like(f"{prefix}%"))
            .order_by(WalletTransaction.transaction_number.desc())
            .first()
        )
        return latest.transaction_number if latest else None
