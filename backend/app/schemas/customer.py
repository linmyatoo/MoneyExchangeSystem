import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None)


class CustomerResponse(CustomerBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    # Calculated fields for Phase 6 requirements
    outstanding_credit: Decimal = Field(default=Decimal("0.00"))
    total_transactions: int = Field(default=0)

    model_config = ConfigDict(from_attributes=True)
