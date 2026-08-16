import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_user, get_db
from app.models.user import User
from app.schemas.user import PaginatedResponse
from app.schemas.wallet_transaction import (
    WalletTransactionCreate,
    WalletTransactionResponse,
)
from app.services.wallet_transaction_service import WalletTransactionService

router = APIRouter()
admin_staff_roles = RoleChecker(["admin", "staff"])


@router.get("", response_model=PaginatedResponse[WalletTransactionResponse])
def list_wallet_transactions(
    q: Optional[str] = Query(None, description="Search by transaction number or notes"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type (deposit, withdrawal, transfer)"),
    wallet_account_id: Optional[uuid.UUID] = Query(None, description="Filter by wallet account"),
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer"),
    is_credit: Optional[bool] = Query(None, description="Filter by credit status"),
    period: Optional[str] = Query(None, description="Filter by 'today', 'yesterday', 'this_month', or YYYY-MM-DD"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """List wallet transactions with pagination and filtering."""
    tx_service = WalletTransactionService(db)
    skip = (page - 1) * page_size
    items, total = tx_service.get_transactions(
        skip=skip,
        limit=page_size,
        search=q,
        wallet_account_id=wallet_account_id,
        customer_id=customer_id,
        is_credit=is_credit,
        period=period,
        transaction_type=transaction_type,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=WalletTransactionResponse)
def create_wallet_transaction(
    transaction_in: WalletTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Create a new wallet transaction."""
    tx_service = WalletTransactionService(db)
    return tx_service.create_transaction(obj_in=transaction_in, created_by=current_user.id)


@router.put("/{transaction_id}", response_model=WalletTransactionResponse)
def update_wallet_transaction(
    transaction_id: uuid.UUID,
    transaction_in: WalletTransactionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Update a wallet transaction and adjust wallet balances."""
    tx_service = WalletTransactionService(db)
    return tx_service.update_transaction(id=transaction_id, obj_in=transaction_in)


@router.delete("/{transaction_id}", response_model=WalletTransactionResponse)
def delete_wallet_transaction(
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Delete a wallet transaction and reverse wallet balance changes."""
    tx_service = WalletTransactionService(db)
    return tx_service.delete_transaction(id=transaction_id)
