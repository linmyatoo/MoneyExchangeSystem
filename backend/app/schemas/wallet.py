import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# Wallet Type Schemas
class WalletTypeResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# Wallet Account Schemas
class WalletAccountBase(BaseModel):
    account_name: str = Field(..., min_length=2, max_length=255)
    account_number: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    wallet_type_id: uuid.UUID


class WalletAccountCreate(WalletAccountBase):
    opening_balance: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)


class WalletAccountUpdate(BaseModel):
    account_name: Optional[str] = Field(None, min_length=2, max_length=255)
    account_number: Optional[str] = Field(None, max_length=100)
    balance: Optional[Decimal] = Field(None, ge=0, decimal_places=2)


class WalletAccountResponse(WalletAccountBase):
    id: uuid.UUID
    opening_balance: Decimal
    balance: Decimal
    wallet_type: WalletTypeResponse
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
