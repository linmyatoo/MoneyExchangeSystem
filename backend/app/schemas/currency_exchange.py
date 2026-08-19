import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.customer import CustomerResponse
from app.schemas.user import UserResponse
from app.schemas.wallet import WalletAccountResponse


class CurrencyExchangeBase(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    mmk_wallet_id: uuid.UUID
    thb_wallet_id: uuid.UUID
    currency_code: str = Field(default="THB")
    foreign_amount: Decimal = Field(..., gt=0, decimal_places=2)
    local_amount: Decimal = Field(..., gt=0, decimal_places=2)
    notes: Optional[str] = None


class CurrencyBuyCreate(CurrencyExchangeBase):
    pass


class CurrencySellCreate(CurrencyExchangeBase):
    pass


class CurrencyExchangeResponse(CurrencyExchangeBase):
    id: uuid.UUID
    transaction_number: str
    transaction_date: datetime
    rate_used: Decimal
    profit: Decimal
    
    exchange_rate_id: Optional[uuid.UUID] = None
    created_by: uuid.UUID

    customer: Optional[CustomerResponse] = None
    creator: Optional[UserResponse] = None
    mmk_wallet: Optional[WalletAccountResponse] = None
    thb_wallet: Optional[WalletAccountResponse] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class THBWalletBalance(BaseModel):
    name: str
    balance: Decimal


class THBInventorySummaryResponse(BaseModel):
    total_remaining: Decimal
    buy_thb: Decimal
    buy_mmk: Decimal
    sell_thb: Decimal
    sell_mmk: Decimal
    profit: Decimal
    wallet_balances: List[THBWalletBalance] = []
