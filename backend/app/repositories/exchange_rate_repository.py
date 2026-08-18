import calendar
from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional

from sqlalchemy.orm import Session

from app.models.exchange_rate import ExchangeRate
from app.repositories.base import BaseRepository


class ExchangeRateRepository(BaseRepository[ExchangeRate]):
    def __init__(self, db: Session):
        super().__init__(ExchangeRate, db)

    def get_active_rate(self, currency_code: str) -> Optional[ExchangeRate]:
        return (
            self.db.query(ExchangeRate)
            .filter(
                ExchangeRate.currency_code == currency_code,
                ExchangeRate.is_active == True,
                ExchangeRate.deleted_at.is_(None)
            )
            .first()
        )

    def deactivate_current_rates(self, currency_code: str) -> None:
        rates = (
            self.db.query(ExchangeRate)
            .filter(
                ExchangeRate.currency_code == currency_code,
                ExchangeRate.is_active == True,
                ExchangeRate.deleted_at.is_(None)
            )
            .all()
        )
        for rate in rates:
            rate.is_active = False
            self.db.add(rate)
        
        self.db.flush()

    def get_rate_history(
        self,
        currency_code: Optional[str] = None,
        period: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ExchangeRate], int]:
        query = self.db.query(ExchangeRate).filter(ExchangeRate.deleted_at.is_(None))

        if currency_code:
            query = query.filter(ExchangeRate.currency_code == currency_code)

        if period:
            today_date = date.today()
            if period == "today":
                start_date = end_date = today_date
            elif period == "yesterday":
                start_date = end_date = today_date - timedelta(days=1)
            elif period == "this_month":
                start_date = today_date.replace(day=1)
                _, last_day = calendar.monthrange(today_date.year, today_date.month)
                end_date = today_date.replace(day=last_day)
            elif period == "this_year":
                start_date = today_date.replace(month=1, day=1)
                end_date = today_date.replace(month=12, day=31)
            else:
                try:
                    start_date = end_date = datetime.strptime(period, "%Y-%m-%d").date()
                except ValueError:
                    start_date = None
                    end_date = None

            if start_date and end_date:
                query = query.filter(
                    ExchangeRate.effective_date.between(start_date, end_date)
                )

        total = query.count()
        items = query.order_by(ExchangeRate.effective_date.desc(), ExchangeRate.created_at.desc()).offset(skip).limit(limit).all()

        return items, total
