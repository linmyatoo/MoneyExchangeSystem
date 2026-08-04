import uuid
from typing import Any, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db, get_current_user
from app.models.user import User
from app.schemas.cash_management import (
    DailyStatusResponse,
    CashOpeningCreate,
    CashOpeningResponse,
    CashClosingCreate,
    CashClosingResponse,
)
from app.services.cash_management_service import CashManagementService

router = APIRouter()
admin_only = RoleChecker(["admin"])

@router.get("/status", response_model=DailyStatusResponse)
def get_daily_status(
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Get the current opening/closing status for today."""
    service = CashManagementService(db)
    return service.get_daily_status()

@router.post("/open", response_model=CashOpeningResponse)
def open_register(
    obj_in: CashOpeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_only),
) -> Any:
    """Open the cash register for the day."""
    service = CashManagementService(db)
    return service.open_register(obj_in, current_user.id)

@router.post("/close", response_model=CashClosingResponse)
def close_register(
    obj_in: CashClosingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_only),
) -> Any:
    """Close the cash register for the day, recording actual physical counts."""
    service = CashManagementService(db)
    return service.close_register(obj_in, current_user.id)

@router.put("/open/{id}", response_model=CashOpeningResponse)
def update_opening(
    id: uuid.UUID,
    obj_in: CashOpeningCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Update an existing cash opening."""
    service = CashManagementService(db)
    return service.update_opening(id, obj_in)

@router.put("/close/{id}", response_model=CashClosingResponse)
def update_closing(
    id: uuid.UUID,
    obj_in: CashClosingCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Update an existing cash closing."""
    service = CashManagementService(db)
    return service.update_closing(id, obj_in)

@router.get("/history", response_model=List[CashOpeningResponse])
def get_history(
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Get historical cash openings and closings."""
    service = CashManagementService(db)
    return service.get_history()
