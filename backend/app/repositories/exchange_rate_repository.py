import uuid
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
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ExchangeRate], int]:
        query = self.db.query(ExchangeRate).filter(ExchangeRate.deleted_at.is_(None))

        if currency_code:
            query = query.filter(ExchangeRate.currency_code == currency_code)

        total = query.count()
        items = query.order_by(ExchangeRate.effective_date.desc(), ExchangeRate.created_at.desc()).offset(skip).limit(limit).all()

        return items, total
