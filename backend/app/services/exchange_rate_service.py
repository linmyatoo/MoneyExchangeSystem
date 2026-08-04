import uuid
from typing import List, Tuple, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.exchange_rate import ExchangeRate
from app.repositories.exchange_rate_repository import ExchangeRateRepository
from app.schemas.exchange_rate import ExchangeRateCreate


class ExchangeRateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ExchangeRateRepository(db)

    def get_active_rate(self, currency_code: str = "THB") -> ExchangeRate:
        rate = self.repo.get_active_rate(currency_code)
        if not rate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active exchange rate found for {currency_code}",
            )
        return rate

    def get_rate_history(
        self, currency_code: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> Tuple[List[ExchangeRate], int]:
        return self.repo.get_rate_history(
            currency_code=currency_code, skip=skip, limit=limit
        )

    def set_new_rate(self, obj_in: ExchangeRateCreate, created_by: uuid.UUID) -> ExchangeRate:
        # 1. Deactivate current active rates for the currency
        self.repo.deactivate_current_rates(obj_in.currency_code)

        # 2. Append new rate
        data = obj_in.model_dump()
        data["is_active"] = True
        data["created_by"] = created_by

        rate = self.repo.create(data)
        self.db.commit()
        return rate
