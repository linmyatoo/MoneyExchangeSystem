import uuid
from decimal import Decimal
from datetime import datetime, date
from typing import List, Tuple

from fastapi import HTTPException, status
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

    def buy_thb(self, obj_in: CurrencyBuyCreate, created_by: uuid.UUID) -> dict:
        mmk_wallet = self.wallet_repo.get_by_id(obj_in.mmk_wallet_id)
        thb_wallet = self.wallet_repo.get_by_id(obj_in.thb_wallet_id)

        if not mmk_wallet or not thb_wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        local_amount = (Decimal('100000') / obj_in.rate_used) * obj_in.foreign_amount
        local_amount = local_amount.quantize(Decimal('0.01'))

        if mmk_wallet.balance < local_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient MMK balance in wallet: {mmk_wallet.account_name}",
            )

        # Update balances
        mmk_wallet.balance -= local_amount
        thb_wallet.balance += obj_in.foreign_amount

        # Create Transaction — no exchange rate lookup needed, rate comes from form
        data = obj_in.model_dump()
        data["transaction_number"] = self._generate_transaction_number("BUY")
        data["transaction_date"] = datetime.utcnow()
        data["local_amount"] = local_amount
        data["profit"] = 0
        data["exchange_rate_id"] = None
        data["created_by"] = created_by
        
        tx = self.exchange_repo.create_buy_transaction(data)
        
        self.db.add(mmk_wallet)
        self.db.add(thb_wallet)
        self.db.commit()
        
        return tx

    def sell_thb(self, obj_in: CurrencySellCreate, created_by: uuid.UUID) -> dict:
        mmk_wallet = self.wallet_repo.get_by_id(obj_in.mmk_wallet_id)
        thb_wallet = self.wallet_repo.get_by_id(obj_in.thb_wallet_id)

        if not mmk_wallet or not thb_wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        local_amount = (Decimal('100000') / obj_in.rate_used) * obj_in.foreign_amount
        local_amount = local_amount.quantize(Decimal('0.01'))

        if thb_wallet.balance < obj_in.foreign_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient THB balance in wallet: {thb_wallet.account_name}",
            )

        # Calculate profit based on avg buy rate vs current sell rate
        avg_buy_rate = self.exchange_repo.get_average_buy_rate()
        if avg_buy_rate > 0:
            profit = ((Decimal('100000') / obj_in.rate_used) - (Decimal('100000') / avg_buy_rate)) * obj_in.foreign_amount
            profit = profit.quantize(Decimal('0.01'))
        else:
            profit = Decimal('0.00')

        # Update balances
        thb_wallet.balance -= obj_in.foreign_amount
        mmk_wallet.balance += local_amount

        # Create Transaction — no exchange rate lookup needed, rate comes from form
        data = obj_in.model_dump()
        data["transaction_number"] = self._generate_transaction_number("SELL")
        data["transaction_date"] = datetime.utcnow()
        data["local_amount"] = local_amount
        data["profit"] = profit
        data["exchange_rate_id"] = None
        data["created_by"] = created_by
        
        tx = self.exchange_repo.create_sell_transaction(data)
        
        self.db.add(mmk_wallet)
        self.db.add(thb_wallet)
        self.db.commit()
        
        return tx

    def get_history(
        self, skip: int = 0, limit: int = 20, search: str = None, tx_type: str = None, period: str = None
    ) -> Tuple[List[dict], int]:
        return self.exchange_repo.get_paginated_history(
            skip=skip, limit=limit, search=search, tx_type=tx_type, period=period
        )

    def get_inventory_summary(self) -> dict:
        return self.exchange_repo.get_thb_inventory_summary()
