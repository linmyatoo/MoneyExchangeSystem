import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CurrencyBuyTransaction(BaseModel):
    """Buying foreign currency FROM customer (customer gives THB, we give MMK)."""

    __tablename__ = "currency_buy_transactions"

    transaction_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # For walk-in customers
    currency_code: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    foreign_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    rate_used: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4), nullable=False
    )
    local_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    profit: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Foreign Keys
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True
    )
    exchange_rate_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exchange_rates.id"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    mmk_wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_accounts.id"), nullable=False, index=True
    )
    thb_wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_accounts.id"), nullable=False, index=True
    )

    # Relationships
    customer = relationship(
        "Customer", back_populates="currency_buy_transactions", lazy="joined"
    )
    exchange_rate = relationship("ExchangeRate", lazy="joined")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    mmk_wallet = relationship("WalletAccount", foreign_keys=[mmk_wallet_id], lazy="joined")
    thb_wallet = relationship("WalletAccount", foreign_keys=[thb_wallet_id], lazy="joined")

    def __repr__(self) -> str:
        return f"<CurrencyBuyTransaction(number={self.transaction_number}, amount={self.foreign_amount} {self.currency_code})>"
