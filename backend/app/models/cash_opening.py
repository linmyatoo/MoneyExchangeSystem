import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CashOpening(BaseModel):
    __tablename__ = "cash_openings"

    opening_date: Mapped[date] = mapped_column(
        Date, nullable=False, unique=True, index=True
    )
    mmk_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    thb_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="open", nullable=False, index=True
    )  # "open" or "closed"
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Foreign Keys
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    closing = relationship(
        "CashClosing", back_populates="opening", uselist=False, lazy="joined"
    )

    def __repr__(self) -> str:
        return f"<CashOpening(date={self.opening_date}, mmk={self.mmk_amount})>"
