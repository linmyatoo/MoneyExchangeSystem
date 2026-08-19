import uuid
from decimal import Decimal
from datetime import datetime, date
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.currency_exchange_repository import CurrencyExchangeRepository
from app.repositories.wallet_account_repository import WalletAccountRepository
from app.schemas.currency_exchange import CurrencyBuyCreate, CurrencySellCreate


class CurrencyExchangeService:
    def __init__(self, db: Session):
        self.db = db
        self.exchange_repo = CurrencyExchangeRepository(db)
        self.wallet_repo = WalletAccountRepository(db)

    def _generate_transaction_number(self, prefix: str) -> str:
        today = date.today().strftime("%Y%m%d")
        short_uuid = uuid.uuid4().hex[:6].upper()
        return f"{prefix}-{today}-{short_uuid}"

    def _load_wallet_pair(self, mmk_wallet_id: uuid.UUID, thb_wallet_id: uuid.UUID):
        mmk_wallet = self.wallet_repo.get_by_id(mmk_wallet_id)
        thb_wallet = self.wallet_repo.get_by_id(thb_wallet_id)

        if not mmk_wallet or not thb_wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        return mmk_wallet, thb_wallet

    def _calc_rate_used(self, foreign_amount: Decimal, local_amount: Decimal) -> Decimal:
        """Derive the rate (THB per 100,000 MMK) from the two amounts entered."""
        rate = (Decimal('100000') * foreign_amount) / local_amount
        return rate.quantize(Decimal('0.0001'))

    def _calc_profit(self, foreign_amount: Decimal, local_amount: Decimal) -> Decimal:
        """What we take in on a sell versus what that THB cost us on average."""
        avg_buy_rate = self.exchange_repo.get_average_buy_rate()
        if avg_buy_rate > 0:
            cost = ((Decimal('100000') / avg_buy_rate) * foreign_amount).quantize(Decimal('0.01'))
            return local_amount - cost
        return Decimal('0.00')

    def _check_balances(self, *wallets, reversing: bool = False) -> None:
        """Every wallet a transaction touched must still hold a non-negative balance."""
        for wallet in wallets:
            if wallet.balance < 0:
                if reversing:
                    detail = (
                        f"Cannot reverse this transaction: {wallet.account_name} "
                        "does not hold enough to give back."
                    )
                else:
                    detail = f"Insufficient balance in wallet: {wallet.account_name}"
                # Drop the half-applied balance changes before bailing out.
                self.db.rollback()
                raise HTTPException(status_code=400, detail=detail)

    def _apply_buy(self, mmk_wallet, thb_wallet, foreign_amount: Decimal, local_amount: Decimal) -> None:
        mmk_wallet.balance -= local_amount
        thb_wallet.balance += foreign_amount
        self.db.add(mmk_wallet)
        self.db.add(thb_wallet)

    def _apply_sell(self, mmk_wallet, thb_wallet, foreign_amount: Decimal, local_amount: Decimal) -> None:
        thb_wallet.balance -= foreign_amount
        mmk_wallet.balance += local_amount
        self.db.add(mmk_wallet)
        self.db.add(thb_wallet)

    def _revert(self, tx, is_buy: bool):
        """Undo the balance movement a stored transaction made."""
        mmk_wallet, thb_wallet = self._load_wallet_pair(tx.mmk_wallet_id, tx.thb_wallet_id)
        if is_buy:
            mmk_wallet.balance += tx.local_amount
            thb_wallet.balance -= tx.foreign_amount
        else:
            thb_wallet.balance += tx.foreign_amount
            mmk_wallet.balance -= tx.local_amount
        self.db.add(mmk_wallet)
        self.db.add(thb_wallet)
        return mmk_wallet, thb_wallet

    def _assign(self, tx, obj_in, rate_used: Decimal, profit: Optional[Decimal] = None):
        data = obj_in.model_dump()
        data["rate_used"] = rate_used
        if profit is not None:
            data["profit"] = profit
        for field, value in data.items():
            setattr(tx, field, value)
        self.db.add(tx)
        return tx

    def _get_buy(self, id: uuid.UUID):
        tx = self.exchange_repo.get_buy_by_id(id)
        if not tx:
            raise HTTPException(status_code=404, detail="Buy transaction not found")
        return tx

    def _get_sell(self, id: uuid.UUID):
        tx = self.exchange_repo.get_sell_by_id(id)
        if not tx:
            raise HTTPException(status_code=404, detail="Sell transaction not found")
        return tx

    def buy_thb(self, obj_in: CurrencyBuyCreate, created_by: uuid.UUID) -> dict:
        mmk_wallet, thb_wallet = self._load_wallet_pair(obj_in.mmk_wallet_id, obj_in.thb_wallet_id)

        local_amount = obj_in.local_amount
        rate_used = self._calc_rate_used(obj_in.foreign_amount, local_amount)

        self._apply_buy(mmk_wallet, thb_wallet, obj_in.foreign_amount, local_amount)
        self._check_balances(mmk_wallet, thb_wallet)

        # Create Transaction — the rate is derived from the amounts, not entered
        data = obj_in.model_dump()
        data["transaction_number"] = self._generate_transaction_number("BUY")
        data["transaction_date"] = datetime.utcnow()
        data["rate_used"] = rate_used
        data["profit"] = 0
        data["exchange_rate_id"] = None
        data["created_by"] = created_by

        tx = self.exchange_repo.create_buy_transaction(data)
        self.db.commit()

        return tx

    def sell_thb(self, obj_in: CurrencySellCreate, created_by: uuid.UUID) -> dict:
        mmk_wallet, thb_wallet = self._load_wallet_pair(obj_in.mmk_wallet_id, obj_in.thb_wallet_id)

        local_amount = obj_in.local_amount
        rate_used = self._calc_rate_used(obj_in.foreign_amount, local_amount)
        profit = self._calc_profit(obj_in.foreign_amount, local_amount)

        self._apply_sell(mmk_wallet, thb_wallet, obj_in.foreign_amount, local_amount)
        self._check_balances(mmk_wallet, thb_wallet)

        # Create Transaction — the rate is derived from the amounts, not entered
        data = obj_in.model_dump()
        data["transaction_number"] = self._generate_transaction_number("SELL")
        data["transaction_date"] = datetime.utcnow()
        data["rate_used"] = rate_used
        data["profit"] = profit
        data["exchange_rate_id"] = None
        data["created_by"] = created_by

        tx = self.exchange_repo.create_sell_transaction(data)
        self.db.commit()

        return tx

    def update_buy(self, id: uuid.UUID, obj_in: CurrencyBuyCreate) -> dict:
        tx = self._get_buy(id)

        old_mmk, old_thb = self._revert(tx, is_buy=True)
        self._check_balances(old_mmk, old_thb, reversing=True)

        mmk_wallet, thb_wallet = self._load_wallet_pair(obj_in.mmk_wallet_id, obj_in.thb_wallet_id)
        self._apply_buy(mmk_wallet, thb_wallet, obj_in.foreign_amount, obj_in.local_amount)
        self._check_balances(mmk_wallet, thb_wallet)

        rate_used = self._calc_rate_used(obj_in.foreign_amount, obj_in.local_amount)
        self._assign(tx, obj_in, rate_used=rate_used)
        self.db.commit()

        return tx

    def update_sell(self, id: uuid.UUID, obj_in: CurrencySellCreate) -> dict:
        tx = self._get_sell(id)

        old_mmk, old_thb = self._revert(tx, is_buy=False)
        self._check_balances(old_mmk, old_thb, reversing=True)

        mmk_wallet, thb_wallet = self._load_wallet_pair(obj_in.mmk_wallet_id, obj_in.thb_wallet_id)
        self._apply_sell(mmk_wallet, thb_wallet, obj_in.foreign_amount, obj_in.local_amount)
        self._check_balances(mmk_wallet, thb_wallet)

        rate_used = self._calc_rate_used(obj_in.foreign_amount, obj_in.local_amount)
        profit = self._calc_profit(obj_in.foreign_amount, obj_in.local_amount)
        self._assign(tx, obj_in, rate_used=rate_used, profit=profit)
        self.db.commit()

        return tx

    def delete_buy(self, id: uuid.UUID) -> dict:
        tx = self._get_buy(id)

        mmk_wallet, thb_wallet = self._revert(tx, is_buy=True)
        self._check_balances(mmk_wallet, thb_wallet, reversing=True)

        self.exchange_repo.soft_delete(tx)
        self.db.commit()

        return tx

    def delete_sell(self, id: uuid.UUID) -> dict:
        tx = self._get_sell(id)

        mmk_wallet, thb_wallet = self._revert(tx, is_buy=False)
        self._check_balances(mmk_wallet, thb_wallet, reversing=True)

        self.exchange_repo.soft_delete(tx)
        self.db.commit()

        return tx

    def get_history(
        self, skip: int = 0, limit: int = 20, search: str = None, tx_type: str = None, period: str = None
    ) -> Tuple[List[dict], int]:
        return self.exchange_repo.get_paginated_history(
            skip=skip, limit=limit, search=search, tx_type=tx_type, period=period
        )

    def get_inventory_summary(self, period: str = None) -> dict:
        return self.exchange_repo.get_thb_inventory_summary(period=period)
