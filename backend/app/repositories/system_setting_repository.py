from typing import List, Dict

from sqlalchemy.orm import Session
from app.models.system_setting import SystemSetting
from app.schemas.system_setting import SystemSettingUpdate


class SystemSettingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[SystemSetting]:
        return self.db.query(SystemSetting).all()

    def get_as_dict(self) -> Dict[str, str]:
        settings = self.get_all()
        return {s.key: s.value for s in settings}

    def get_by_key(self, key: str) -> SystemSetting:
        return self.db.query(SystemSetting).filter(SystemSetting.key == key).first()

    def bulk_upsert(self, settings_in: List[SystemSettingUpdate]) -> List[SystemSetting]:
        result = []
        for s_in in settings_in:
            db_obj = self.get_by_key(s_in.key)
            if db_obj:
                db_obj.value = s_in.value
                if s_in.description is not None:
                    db_obj.description = s_in.description
                result.append(db_obj)
            else:
                new_obj = SystemSetting(
                    key=s_in.key,
                    value=s_in.value,
                    description=s_in.description
                )
                self.db.add(new_obj)
                result.append(new_obj)
                
        self.db.commit()
        return self.get_all()
