import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class WalletTransactionItem(BaseModel):
    __tablename__ = "wallet_transaction_items"

    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=2), nullable=False
    )

    # Foreign Keys
    wallet_transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id"),
        nullable=False,
        index=True,
    )

    # Relationships
    transaction = relationship(
        "WalletTransaction", back_populates="items", lazy="joined"
    )

    def __repr__(self) -> str:
        return f"<WalletTransactionItem(desc={self.description}, amount={self.amount})>"
