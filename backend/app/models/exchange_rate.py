import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ExchangeRate(BaseModel):
    __tablename__ = "exchange_rates"

    currency_code: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )  # "THB"
    buy_rate: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4), nullable=False
    )
    sell_rate: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4), nullable=False
    )
    effective_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Foreign Keys
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")

    def __repr__(self) -> str:
        return f"<ExchangeRate(currency={self.currency_code}, buy={self.buy_rate}, sell={self.sell_rate})>"
