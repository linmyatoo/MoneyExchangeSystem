import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CashClosing(BaseModel):
    __tablename__ = "cash_closings"

    closing_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    mmk_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    thb_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    expected_mmk_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    expected_thb_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    mmk_discrepancy: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    thb_discrepancy: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Foreign Keys
    cash_opening_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cash_openings.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    opening = relationship("CashOpening", back_populates="closing", lazy="joined")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")

    def __repr__(self) -> str:
        return f"<CashClosing(date={self.closing_date}, mmk={self.mmk_amount})>"
