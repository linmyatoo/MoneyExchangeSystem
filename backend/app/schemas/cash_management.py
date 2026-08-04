import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel


class UserBasic(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str


class CashOpeningCreate(BaseModel):
    mmk_amount: Decimal
    thb_amount: Decimal
    notes: Optional[str] = None


class CashOpeningResponse(BaseModel):
    id: uuid.UUID
    opening_date: date
    mmk_amount: Decimal
    thb_amount: Decimal
    status: str
    notes: Optional[str] = None
    created_at: datetime
    creator: UserBasic


class CashClosingCreate(BaseModel):
    mmk_amount: Decimal
    thb_amount: Decimal
    notes: Optional[str] = None


class CashClosingResponse(BaseModel):
    id: uuid.UUID
    closing_date: date
    mmk_amount: Decimal
    thb_amount: Decimal
    expected_mmk_amount: Decimal
    expected_thb_amount: Decimal
    mmk_discrepancy: Decimal
    thb_discrepancy: Decimal
    notes: Optional[str] = None
    created_at: datetime
    creator: UserBasic


class DailyStatusResponse(BaseModel):
    status: str  # "NOT_OPENED", "OPEN", "CLOSED"
    opening: Optional[CashOpeningResponse] = None
    closing: Optional[CashClosingResponse] = None
    expected_mmk_now: Optional[Decimal] = None
    expected_thb_now: Optional[Decimal] = None
