import uuid
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.wallet_account import WalletAccount
from app.models.wallet_type import WalletType
from app.repositories.wallet_account_repository import WalletAccountRepository
from app.repositories.wallet_type_repository import WalletTypeRepository
from app.schemas.wallet import WalletAccountCreate, WalletAccountUpdate


class WalletService:
    def __init__(self, db: Session):
        self.db = db
        self.wallet_type_repo = WalletTypeRepository(db)
        self.wallet_account_repo = WalletAccountRepository(db)

    def get_wallet_types(self) -> List[WalletType]:
        return self.wallet_type_repo.get_all_active()

    def get_wallet_accounts(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        wallet_type_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[WalletAccount], int]:
        return self.wallet_account_repo.get_paginated_accounts(
            skip=skip, limit=limit, search=search, wallet_type_id=wallet_type_id, is_active=is_active
        )

    def get_wallet_account(self, id: uuid.UUID) -> WalletAccount:
        wallet = self.wallet_account_repo.get_by_id(id)
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet account not found",
            )
        return wallet

    def create_wallet_account(self, obj_in: WalletAccountCreate) -> WalletAccount:
        wallet_type = self.wallet_type_repo.get_by_id(obj_in.wallet_type_id)
        if not wallet_type or not wallet_type.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive wallet type",
            )

        # Ensure opening balance is assigned to balance initially
        create_data = obj_in.model_dump()
        create_data["balance"] = obj_in.opening_balance

        wallet = self.wallet_account_repo.create(create_data)
        return wallet

    def update_wallet_account(
        self, id: uuid.UUID, obj_in: WalletAccountUpdate
    ) -> WalletAccount:
        wallet = self.get_wallet_account(id)
        wallet = self.wallet_account_repo.update(db_obj=wallet, obj_in=obj_in.model_dump(exclude_unset=True))
        return wallet

    def toggle_status(self, id: uuid.UUID, is_active: bool) -> WalletAccount:
        wallet = self.get_wallet_account(id)
        wallet = self.wallet_account_repo.update(db_obj=wallet, obj_in={"is_active": is_active})
        return wallet

    def delete_wallet_account(self, id: uuid.UUID) -> WalletAccount:
        wallet = self.get_wallet_account(id)
        wallet = self.wallet_account_repo.soft_delete(wallet)
        return wallet
