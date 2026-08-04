import uuid
from datetime import date
from typing import Optional, Tuple, List
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.cash_opening import CashOpening
from app.models.cash_closing import CashClosing
from app.models.wallet_account import WalletAccount
from app.models.wallet_type import WalletType
from app.schemas.cash_management import CashOpeningCreate, CashClosingCreate


class CashManagementRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_todays_opening(self, target_date: date) -> Optional[CashOpening]:
        return self.db.query(CashOpening).filter(
            CashOpening.opening_date == target_date,
            CashOpening.deleted_at.is_(None)
        ).first()

    def get_todays_closing(self, target_date: date) -> Optional[CashClosing]:
        return self.db.query(CashClosing).filter(
            CashClosing.closing_date == target_date,
            CashClosing.deleted_at.is_(None)
        ).first()

    def get_expected_balances(self) -> Tuple[Decimal, Decimal]:
        """Calculates expected physical cash by summing up designated physical wallets."""
        
        # Expected MMK from "Cash" wallets
        mmk_balance = self.db.query(func.sum(WalletAccount.balance)).join(WalletType).filter(
            WalletType.name == "Cash",
            WalletAccount.deleted_at.is_(None)
        ).scalar() or Decimal("0.00")
        
        # Expected THB from "Thai Bank" wallets 
        thai_bank_types = ['Thai Bank', 'KBank', 'BBL', 'SCB', 'KTB', 'TTB', 'CIMBT', 'BAY', 'LHBank', 'KKP', 'UOBT']
        thb_balance = self.db.query(func.sum(WalletAccount.balance)).join(WalletType).filter(
            WalletType.name.in_(thai_bank_types),
            WalletAccount.deleted_at.is_(None)
        ).scalar() or Decimal("0.00")
        
        return mmk_balance, thb_balance

    def create_opening(self, obj_in: CashOpeningCreate, created_by: uuid.UUID) -> CashOpening:
        db_obj = CashOpening(
            opening_date=date.today(),
            mmk_amount=obj_in.mmk_amount,
            thb_amount=obj_in.thb_amount,
            status="open",
            notes=obj_in.notes,
            created_by=created_by
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def create_closing(self, obj_in: CashClosingCreate, opening_id: uuid.UUID, expected_mmk: Decimal, expected_thb: Decimal, created_by: uuid.UUID) -> CashClosing:
        mmk_discrepancy = obj_in.mmk_amount - expected_mmk
        thb_discrepancy = obj_in.thb_amount - expected_thb
        
        db_obj = CashClosing(
            closing_date=date.today(),
            mmk_amount=obj_in.mmk_amount,
            thb_amount=obj_in.thb_amount,
            expected_mmk_amount=expected_mmk,
            expected_thb_amount=expected_thb,
            mmk_discrepancy=mmk_discrepancy,
            thb_discrepancy=thb_discrepancy,
            notes=obj_in.notes,
            cash_opening_id=opening_id,
            created_by=created_by
        )
        self.db.add(db_obj)
        
        # Update opening status
        opening = self.db.query(CashOpening).filter(CashOpening.id == opening_id).first()
        if opening:
            opening.status = "closed"
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_opening(self, opening_id: uuid.UUID, obj_in: CashOpeningCreate) -> Optional[CashOpening]:
        db_obj = self.db.query(CashOpening).filter(CashOpening.id == opening_id, CashOpening.deleted_at.is_(None)).first()
        if not db_obj:
            return None
            
        db_obj.mmk_amount = obj_in.mmk_amount
        db_obj.thb_amount = obj_in.thb_amount
        if obj_in.notes is not None:
            db_obj.notes = obj_in.notes
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_closing(self, closing_id: uuid.UUID, obj_in: CashClosingCreate) -> Optional[CashClosing]:
        db_obj = self.db.query(CashClosing).filter(CashClosing.id == closing_id, CashClosing.deleted_at.is_(None)).first()
        if not db_obj:
            return None
            
        db_obj.mmk_amount = obj_in.mmk_amount
        db_obj.thb_amount = obj_in.thb_amount
        # Recalculate discrepancies based on stored expected amounts
        db_obj.mmk_discrepancy = obj_in.mmk_amount - db_obj.expected_mmk_amount
        db_obj.thb_discrepancy = obj_in.thb_amount - db_obj.expected_thb_amount
        
        if obj_in.notes is not None:
            db_obj.notes = obj_in.notes
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_opening_history(self, limit: int = 50) -> List[CashOpening]:
        return self.db.query(CashOpening).filter(
            CashOpening.deleted_at.is_(None)
        ).order_by(CashOpening.opening_date.desc()).limit(limit).all()
