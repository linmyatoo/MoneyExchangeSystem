import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class AuditLog(Base, UUIDPrimaryKeyMixin):
    """Audit log — no soft delete, immutable records."""

    __tablename__ = "audit_logs"

    action: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # "CREATE", "UPDATE", "DELETE"
    entity_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    entity_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Foreign Keys
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    # Relationships
    user = relationship("User", lazy="joined")

    def __repr__(self) -> str:
        return f"<AuditLog(action={self.action}, entity={self.entity_type}:{self.entity_id})>"
