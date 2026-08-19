import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_user, get_db
from app.models.user import User
from app.schemas.currency_exchange import (
    CurrencyBuyCreate,
    CurrencySellCreate,
    CurrencyExchangeResponse,
    THBInventorySummaryResponse,
)
from app.services.currency_exchange_service import CurrencyExchangeService

router = APIRouter()
admin_staff_roles = RoleChecker(["admin", "staff"])


@router.get("/inventory", response_model=THBInventorySummaryResponse)
def get_inventory(
    period: Optional[str] = Query("today", description="Totals period: 'today', 'yesterday', 'this_month', or empty for all time"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Get THB inventory summary with buy/sell totals for the given period."""
    service = CurrencyExchangeService(db)
    return service.get_inventory_summary(period=period)


@router.get("/history")
def get_history(
    q: Optional[str] = Query(None, description="Search by transaction number or customer"),
    tx_type: Optional[str] = Query(None, description="Filter by 'buy' or 'sell'"),
    period: Optional[str] = Query(None, description="Filter by 'today', 'yesterday', 'this_month'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Get combined history of Buy and Sell transactions."""
    service = CurrencyExchangeService(db)
    skip = (page - 1) * page_size
    items, total = service.get_history(skip=skip, limit=page_size, search=q, tx_type=tx_type, period=period)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/buy", response_model=CurrencyExchangeResponse)
def buy_thb(
    obj_in: CurrencyBuyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Buy THB from a customer."""
    service = CurrencyExchangeService(db)
    return service.buy_thb(obj_in=obj_in, created_by=current_user.id)


@router.post("/sell", response_model=CurrencyExchangeResponse)
def sell_thb(
    obj_in: CurrencySellCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Sell THB to a customer."""
    service = CurrencyExchangeService(db)
    return service.sell_thb(obj_in=obj_in, created_by=current_user.id)


@router.put("/buy/{transaction_id}", response_model=CurrencyExchangeResponse)
def update_buy(
    transaction_id: uuid.UUID,
    obj_in: CurrencyBuyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Edit a buy transaction, restoring the old wallet amounts first."""
    service = CurrencyExchangeService(db)
    return service.update_buy(id=transaction_id, obj_in=obj_in)


@router.put("/sell/{transaction_id}", response_model=CurrencyExchangeResponse)
def update_sell(
    transaction_id: uuid.UUID,
    obj_in: CurrencySellCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Edit a sell transaction, restoring the old wallet amounts first."""
    service = CurrencyExchangeService(db)
    return service.update_sell(id=transaction_id, obj_in=obj_in)


@router.delete("/buy/{transaction_id}", response_model=CurrencyExchangeResponse)
def delete_buy(
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Delete a buy transaction and restore the wallet amounts."""
    service = CurrencyExchangeService(db)
    return service.delete_buy(id=transaction_id)


@router.delete("/sell/{transaction_id}", response_model=CurrencyExchangeResponse)
def delete_sell(
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Delete a sell transaction and restore the wallet amounts."""
    service = CurrencyExchangeService(db)
    return service.delete_sell(id=transaction_id)
