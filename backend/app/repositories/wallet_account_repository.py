import uuid
from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.wallet_account import WalletAccount
from app.repositories.base import BaseRepository


class WalletAccountRepository(BaseRepository[WalletAccount]):
    def __init__(self, db: Session):
        super().__init__(WalletAccount, db)

    def get_paginated_accounts(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        wallet_type_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[WalletAccount], int]:
        query = self.db.query(WalletAccount).filter(WalletAccount.deleted_at.is_(None))

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    WalletAccount.account_name.ilike(search_term),
                    WalletAccount.account_number.ilike(search_term),
                )
            )

        if wallet_type_id:
            query = query.filter(WalletAccount.wallet_type_id == wallet_type_id)

        if is_active is not None:
            query = query.filter(WalletAccount.is_active == is_active)

        total = query.count()
        items = query.order_by(WalletAccount.created_at.desc()).offset(skip).limit(limit).all()

        return items, total
