import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Credit(BaseModel):
    __tablename__ = "credits"

    credit_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # "lend" or "borrow"
    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    remaining_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # "pending", "partial", "paid"
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Foreign Keys
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    customer = relationship("Customer", back_populates="credits", lazy="joined")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    payments = relationship(
        "CreditPayment", back_populates="credit", lazy="select",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Credit(type={self.credit_type}, amount={self.amount}, status={self.status})>"
