import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserResponse


class ExchangeRateBase(BaseModel):
    currency_code: str = Field(..., max_length=10)
    buy_rate: Decimal = Field(..., gt=0, decimal_places=4)
    sell_rate: Decimal = Field(..., gt=0, decimal_places=4)
    effective_date: date


class ExchangeRateCreate(ExchangeRateBase):
    pass


class ExchangeRateResponse(ExchangeRateBase):
    id: uuid.UUID
    is_active: bool
    created_by: uuid.UUID
    creator: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
