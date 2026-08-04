import uuid
from typing import Optional, Dict, Any, Tuple, List

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_logs(self, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> Tuple[List[AuditLog], int]:
        query = self.db.query(AuditLog)

        if search:
            query = query.outerjoin(User, AuditLog.user_id == User.id).filter(
                or_(
                    AuditLog.action.ilike(f"%{search}%"),
                    AuditLog.entity_type.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%")
                )
            )

        total = query.count()
        items = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def create(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        old_values: Optional[Dict[str, Any]],
        new_values: Optional[Dict[str, Any]],
        user_id: Optional[uuid.UUID],
        ip_address: Optional[str]
    ) -> AuditLog:
        db_obj = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            user_id=user_id,
            ip_address=ip_address
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
