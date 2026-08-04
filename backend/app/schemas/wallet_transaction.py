import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.customer import CustomerResponse
from app.schemas.user import UserResponse
from app.schemas.wallet import WalletAccountResponse


class WalletTransactionBase(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    from_wallet_account_id: Optional[uuid.UUID] = None
    to_wallet_account_id: Optional[uuid.UUID] = None
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    profit: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)
    profit_wallet_account_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    is_credit: bool = False


class WalletTransactionCreate(WalletTransactionBase):
    pass


class WalletTransactionResponse(WalletTransactionBase):
    id: uuid.UUID
    transaction_number: str
    transaction_date: datetime
    transaction_type: str
    created_by: uuid.UUID
    
    # Relationships
    customer: Optional[CustomerResponse] = None
    from_wallet_account: Optional[WalletAccountResponse] = None
    to_wallet_account: Optional[WalletAccountResponse] = None
    creator: Optional[UserResponse] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
