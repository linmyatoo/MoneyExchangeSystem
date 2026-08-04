from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class WalletType(BaseModel):
    __tablename__ = "wallet_types"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    accounts = relationship("WalletAccount", back_populates="wallet_type", lazy="select")

    def __repr__(self) -> str:
        return f"<WalletType(name={self.name}, code={self.code})>"
