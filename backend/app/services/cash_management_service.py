import uuid
from datetime import date
from typing import Dict, Any

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories.cash_management_repository import CashManagementRepository
from app.schemas.cash_management import CashOpeningCreate, CashClosingCreate


class CashManagementService:
    def __init__(self, db: Session):
        self.repo = CashManagementRepository(db)

    def get_daily_status(self) -> Dict[str, Any]:
        today = date.today()
        opening = self.repo.get_todays_opening(today)
        closing = self.repo.get_todays_closing(today)
        
        status = "NOT_OPENED"
        if closing:
            status = "CLOSED"
        elif opening:
            status = "OPEN"
            
        expected_mmk, expected_thb = None, None
        if status == "OPEN":
            expected_mmk, expected_thb = self.repo.get_expected_balances()

        return {
            "status": status,
            "opening": opening,
            "closing": closing,
            "expected_mmk_now": expected_mmk,
            "expected_thb_now": expected_thb
        }

    def open_register(self, obj_in: CashOpeningCreate, created_by: uuid.UUID):
        today = date.today()
        if self.repo.get_todays_opening(today):
            raise HTTPException(status_code=400, detail="Cash register is already opened for today.")
            
        return self.repo.create_opening(obj_in, created_by)

    def close_register(self, obj_in: CashClosingCreate, created_by: uuid.UUID):
        today = date.today()
        opening = self.repo.get_todays_opening(today)
        
        if not opening:
            raise HTTPException(status_code=400, detail="Cash register has not been opened today.")
            
        if self.repo.get_todays_closing(today):
            raise HTTPException(status_code=400, detail="Cash register is already closed for today.")
            
        expected_mmk, expected_thb = self.repo.get_expected_balances()
        
        return self.repo.create_closing(
            obj_in=obj_in,
            opening_id=opening.id,
            expected_mmk=expected_mmk,
            expected_thb=expected_thb,
            created_by=created_by
        )
    def update_opening(self, opening_id: uuid.UUID, obj_in: CashOpeningCreate):
        result = self.repo.update_opening(opening_id, obj_in)
        if not result:
            raise HTTPException(status_code=404, detail="Cash opening not found")
        return result

    def update_closing(self, closing_id: uuid.UUID, obj_in: CashClosingCreate):
        result = self.repo.update_closing(closing_id, obj_in)
        if not result:
            raise HTTPException(status_code=404, detail="Cash closing not found")
        return result

    def get_history(self) -> Any:
        return self.repo.get_opening_history()
