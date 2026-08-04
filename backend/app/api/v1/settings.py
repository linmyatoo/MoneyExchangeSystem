from typing import List, Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db, get_current_active_user
from app.models.user import User
from app.schemas.system_setting import SystemSettingResponse, SystemSettingsBulkUpdate
from app.services.system_setting_service import SystemSettingService
from app.services.audit_log_service import AuditLogService

router = APIRouter()
admin_only = RoleChecker(["admin"])


@router.get("", response_model=List[SystemSettingResponse])
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> Any:
    """Retrieve all system settings. (Available to authenticated users for UI config)"""
    service = SystemSettingService(db)
    return service.get_all()


@router.put("", response_model=List[SystemSettingResponse])
def update_settings(
    request: Request,
    settings_in: SystemSettingsBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Bulk update system settings (Admin only)."""
    service = SystemSettingService(db)
    
    # Simple audit track
    old_settings = {s.key: s.value for s in service.get_all()}
    
    updated = service.update_settings(settings_in.settings)
    
    new_settings = {s.key: s.value for s in updated}
    
    AuditLogService.log(
        db=db,
        action="UPDATE",
        entity_type="SYSTEM_SETTING",
        entity_id="bulk",
        old_values=old_settings,
        new_values=new_settings,
        user_id=current_user.id,
        request=request
    )
    
    return updated
