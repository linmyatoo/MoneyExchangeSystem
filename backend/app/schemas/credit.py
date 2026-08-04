import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.customer import CustomerResponse
from app.schemas.user import UserResponse


class CreditPaymentBase(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    notes: Optional[str] = None


class CreditPaymentCreate(CreditPaymentBase):
    pass


class CreditPaymentResponse(CreditPaymentBase):
    id: uuid.UUID
    credit_id: uuid.UUID
    payment_date: datetime
    created_by: uuid.UUID
    creator: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreditBase(BaseModel):
    customer_id: uuid.UUID
    credit_type: str = Field(..., description="'lend' or 'borrow'")
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class CreditCreate(CreditBase):
    pass


class CreditUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class CreditResponse(CreditBase):
    id: uuid.UUID
    remaining_amount: Decimal
    status: str
    created_by: uuid.UUID
    
    customer: Optional[CustomerResponse] = None
    creator: Optional[UserResponse] = None
    payments: List[CreditPaymentResponse] = []

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
