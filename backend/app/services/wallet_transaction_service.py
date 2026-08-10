import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.wallet_transaction import WalletTransaction
from app.repositories.wallet_account_repository import WalletAccountRepository
from app.repositories.wallet_transaction_repository import WalletTransactionRepository
from app.schemas.wallet_transaction import WalletTransactionCreate


class WalletTransactionService:
    def __init__(self, db: Session):
        self.db = db
        self.transaction_repo = WalletTransactionRepository(db)
        self.wallet_repo = WalletAccountRepository(db)

    def _generate_transaction_number(self, date: datetime) -> str:
        date_str = date.strftime("%Y%m%d")
        prefix = f"WT-{date_str}-"
        
        latest_tx_num = self.transaction_repo.get_latest_transaction_number(prefix)
        if latest_tx_num:
            sequence = int(latest_tx_num.split("-")[-1]) + 1
        else:
            sequence = 1
            
        return f"{prefix}{sequence:04d}"

    def get_transactions(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        wallet_account_id: Optional[uuid.UUID] = None,
        customer_id: Optional[uuid.UUID] = None,
        is_credit: Optional[bool] = None,
        period: Optional[str] = None,
    ) -> Tuple[List[WalletTransaction], int]:
        return self.transaction_repo.get_paginated_transactions(
            skip=skip,
            limit=limit,
            search=search,
            wallet_account_id=wallet_account_id,
            customer_id=customer_id,
            is_credit=is_credit,
            period=period,
        )

    def get_transaction(self, id: uuid.UUID) -> WalletTransaction:
        tx = self.transaction_repo.get_by_id(id)
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )
        return tx

    def create_transaction(self, obj_in: WalletTransactionCreate, created_by: uuid.UUID) -> WalletTransaction:
        # Determine transaction type
        if obj_in.from_wallet_account_id and obj_in.to_wallet_account_id:
            transaction_type = "transfer"
            if obj_in.from_wallet_account_id == obj_in.to_wallet_account_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Source and Destination wallets cannot be the same.",
                )
        elif obj_in.to_wallet_account_id:
            transaction_type = "deposit"
        elif obj_in.from_wallet_account_id:
            transaction_type = "withdrawal"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one wallet (source or destination) must be provided.",
            )

        # Retrieve wallets and validate balances
        if obj_in.from_wallet_account_id:
            from_wallet = self.wallet_repo.get_by_id(obj_in.from_wallet_account_id)
            if not from_wallet:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source wallet not found")
            
            # Check if source wallet has enough balance
            if from_wallet.balance < obj_in.amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient balance in source wallet. Available: {from_wallet.balance}",
                )

            # Deduct from source
            from_wallet.balance -= obj_in.amount
            self.db.add(from_wallet)

        if obj_in.to_wallet_account_id:
            to_wallet = self.wallet_repo.get_by_id(obj_in.to_wallet_account_id)
            if not to_wallet:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination wallet not found")
            
            # Add to destination
            to_wallet.balance += obj_in.amount
            self.db.add(to_wallet)

        # Deposit profit into the designated profit wallet if specified
        if obj_in.profit_wallet_account_id and obj_in.profit > 0:
            profit_wallet = self.wallet_repo.get_by_id(obj_in.profit_wallet_account_id)
            if not profit_wallet:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profit store wallet not found"
                )
            profit_wallet.balance += obj_in.profit
            self.db.add(profit_wallet)

        # Generate transaction number
        now = datetime.utcnow()
        tx_number = self._generate_transaction_number(now)

        # Create transaction record
        tx_data = obj_in.model_dump(exclude={"customer_name", "profit_wallet_account_id"})
        
        # Append customer name to notes if provided
        if obj_in.customer_name:
            existing_notes = tx_data.get("notes") or ""
            tx_data["notes"] = f"Customer: {obj_in.customer_name}" + (f" | {existing_notes}" if existing_notes else "")
        
        tx_data.update({
            "transaction_number": tx_number,
            "transaction_date": now,
            "transaction_type": transaction_type,
            "created_by": created_by,
        })

        tx = self.transaction_repo.create(tx_data)
        self.db.commit()

        return tx

    def _reverse_balances(self, tx: WalletTransaction):
        """Reverse the balance changes from a transaction."""
        if tx.from_wallet_account_id:
            from_wallet = self.wallet_repo.get_by_id(tx.from_wallet_account_id)
            if from_wallet:
                from_wallet.balance += tx.amount
                self.db.add(from_wallet)

        if tx.to_wallet_account_id:
            to_wallet = self.wallet_repo.get_by_id(tx.to_wallet_account_id)
            if to_wallet:
                to_wallet.balance -= tx.amount
                self.db.add(to_wallet)

    def update_transaction(self, id: uuid.UUID, obj_in: WalletTransactionCreate) -> WalletTransaction:
        tx = self.get_transaction(id)

        # Detect settlement: is_credit was True, now being set to False
        # In this case, balances were already applied on creation, so just flip the flag.
        is_settling = tx.is_credit and not obj_in.is_credit

        if is_settling:
            # Only update the is_credit flag and related metadata, don't touch balances
            update_data = obj_in.model_dump(exclude={"customer_name", "profit_wallet_account_id"})
            # Keep the original transaction_type
            if obj_in.from_wallet_account_id and obj_in.to_wallet_account_id:
                transaction_type = "transfer"
            elif obj_in.to_wallet_account_id:
                transaction_type = "deposit"
            elif obj_in.from_wallet_account_id:
                transaction_type = "withdrawal"
            else:
                transaction_type = tx.transaction_type
            update_data["transaction_type"] = transaction_type

            if obj_in.customer_name:
                existing_notes = update_data.get("notes") or ""
                update_data["notes"] = f"Customer: {obj_in.customer_name}" + (f" | {existing_notes}" if existing_notes else "")

            updated_tx = self.transaction_repo.update(tx, update_data)
            self.db.commit()
            return updated_tx

        # Regular update: reverse old balances and apply new ones
        self._reverse_balances(tx)

        # Determine new transaction type
        if obj_in.from_wallet_account_id and obj_in.to_wallet_account_id:
            transaction_type = "transfer"
        elif obj_in.to_wallet_account_id:
            transaction_type = "deposit"
        elif obj_in.from_wallet_account_id:
            transaction_type = "withdrawal"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one wallet (source or destination) must be provided.",
            )

        # Apply new balance changes
        if obj_in.from_wallet_account_id:
            from_wallet = self.wallet_repo.get_by_id(obj_in.from_wallet_account_id)
            if not from_wallet:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source wallet not found")
            
            if from_wallet.balance < obj_in.amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient balance in source wallet. Available: {from_wallet.balance}",
                )
                
            from_wallet.balance -= obj_in.amount
            self.db.add(from_wallet)

        if obj_in.to_wallet_account_id:
            to_wallet = self.wallet_repo.get_by_id(obj_in.to_wallet_account_id)
            if not to_wallet:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination wallet not found")
            
            to_wallet.balance += obj_in.amount
            self.db.add(to_wallet)

        # Handle profit wallet
        if obj_in.profit_wallet_account_id and obj_in.profit > 0:
            profit_wallet = self.wallet_repo.get_by_id(obj_in.profit_wallet_account_id)
            if not profit_wallet:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profit store wallet not found")
            
            profit_wallet.balance += obj_in.profit
            self.db.add(profit_wallet)

        # Update fields
        update_data = obj_in.model_dump(exclude={"customer_name", "profit_wallet_account_id"})
        update_data["transaction_type"] = transaction_type

        if obj_in.customer_name:
            existing_notes = update_data.get("notes") or ""
            update_data["notes"] = f"Customer: {obj_in.customer_name}" + (f" | {existing_notes}" if existing_notes else "")

        updated_tx = self.transaction_repo.update(tx, update_data)
        self.db.commit()
        return updated_tx

    def delete_transaction(self, id: uuid.UUID) -> WalletTransaction:
        tx = self.get_transaction(id)

        # Reverse balance changes
        self._reverse_balances(tx)

        deleted_tx = self.transaction_repo.soft_delete(tx)
        self.db.commit()
        return deleted_tx
