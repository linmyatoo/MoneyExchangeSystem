from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_log_service import AuditLogService

router = APIRouter()
# Only Admins can view audit logs
admin_only = RoleChecker(["admin"])

@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Retrieve system audit logs."""
    service = AuditLogService(db)
    items, total = service.get_logs(skip=skip, limit=limit, search=search)
    return {
        "items": items,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit
    }
