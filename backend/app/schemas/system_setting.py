from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class SystemSettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SystemSettingUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class SystemSettingsBulkUpdate(BaseModel):
    settings: List[SystemSettingUpdate]
