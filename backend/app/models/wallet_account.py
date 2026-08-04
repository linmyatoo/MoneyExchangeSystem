import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class WalletAccount(BaseModel):
    __tablename__ = "wallet_accounts"

    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), default=Decimal("0.00"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Foreign Keys
    wallet_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_types.id"), nullable=False, index=True
    )

    # Relationships
    wallet_type = relationship("WalletType", back_populates="accounts", lazy="joined")

    def __repr__(self) -> str:
        return f"<WalletAccount(name={self.account_name}, opening={self.opening_balance}, balance={self.balance})>"
