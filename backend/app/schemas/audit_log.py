import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from pydantic import BaseModel


class UserBasic(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime
    user: Optional[UserBasic] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
