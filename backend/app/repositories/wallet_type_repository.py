import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.wallet_type import WalletType
from app.repositories.base import BaseRepository


class WalletTypeRepository(BaseRepository[WalletType]):
    def __init__(self, db: Session):
        super().__init__(WalletType, db)

    def get_by_code(self, code: str) -> Optional[WalletType]:
        return db.query(WalletType).filter(WalletType.code == code).first()

    def get_all_active(self) -> List[WalletType]:
        return (
            self.db.query(WalletType)
            .filter(WalletType.is_active == True, WalletType.deleted_at.is_(None))
            .all()
        )
