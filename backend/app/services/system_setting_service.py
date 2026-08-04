from typing import List

from sqlalchemy.orm import Session
from app.repositories.system_setting_repository import SystemSettingRepository
from app.schemas.system_setting import SystemSettingUpdate
from app.models.system_setting import SystemSetting


class SystemSettingService:
    def __init__(self, db: Session):
        self.repo = SystemSettingRepository(db)
        self.db = db

    def get_all(self) -> List[SystemSetting]:
        return self.repo.get_all()

    def update_settings(self, settings_in: List[SystemSettingUpdate]) -> List[SystemSetting]:
        return self.repo.bulk_upsert(settings_in)
