from typing import Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Customer(BaseModel):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    currency_buy_transactions = relationship(
        "CurrencyBuyTransaction", back_populates="customer", lazy="select"
    )
    currency_sell_transactions = relationship(
        "CurrencySellTransaction", back_populates="customer", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Customer(name={self.name})>"
