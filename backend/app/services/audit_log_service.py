import uuid
from typing import Optional, Dict, Any, Tuple, List

from sqlalchemy.orm import Session
from fastapi import Request
from fastapi.encoders import jsonable_encoder

from app.repositories.audit_log_repository import AuditLogRepository
from app.models.audit_log import AuditLog


class AuditLogService:
    def __init__(self, db: Session):
        self.repo = AuditLogRepository(db)

    def get_logs(self, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> Tuple[List[AuditLog], int]:
        return self.repo.get_logs(skip, limit, search)

    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        user_id: Optional[uuid.UUID] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Static helper to easily inject audit logging into any router/service.
        """
        repo = AuditLogRepository(db)
        ip_address = None
        if request and request.client:
            ip_address = request.client.host
            
        return repo.create(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=jsonable_encoder(old_values) if old_values else None,
            new_values=jsonable_encoder(new_values) if new_values else None,
            user_id=user_id,
            ip_address=ip_address
        )
