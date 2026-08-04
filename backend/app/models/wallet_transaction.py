import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class WalletTransaction(BaseModel):
    __tablename__ = "wallet_transactions"

    transaction_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # "transfer", "deposit", "withdrawal"
    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )
    profit: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_credit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Foreign Keys
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True
    )
    from_wallet_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_accounts.id"), nullable=True, index=True
    )
    to_wallet_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_accounts.id"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    customer = relationship("Customer", lazy="joined")
    from_wallet_account = relationship(
        "WalletAccount", foreign_keys=[from_wallet_account_id], lazy="joined"
    )
    to_wallet_account = relationship(
        "WalletAccount", foreign_keys=[to_wallet_account_id], lazy="joined"
    )
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    items = relationship(
        "WalletTransactionItem", back_populates="transaction", lazy="select",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<WalletTransaction(number={self.transaction_number}, type={self.transaction_type})>"
