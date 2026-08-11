import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db, get_current_active_user
from app.models.user import User
from app.schemas.user import PaginatedResponse
from app.schemas.wallet import (
    WalletAccountCreate,
    WalletAccountResponse,
    WalletAccountUpdate,
    WalletTypeResponse,
)
from app.services.wallet_service import WalletService
from app.services.audit_log_service import AuditLogService

router = APIRouter()
admin_only = RoleChecker(["admin"])
admin_staff_roles = RoleChecker(["admin", "staff"])


@router.get("/types", response_model=List[WalletTypeResponse])
def list_wallet_types(
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """List all active wallet types."""
    wallet_service = WalletService(db)
    return wallet_service.get_wallet_types()


@router.get("/accounts", response_model=PaginatedResponse[WalletAccountResponse])
def list_wallet_accounts(
    q: Optional[str] = Query(None, description="Search by account name or number"),
    wallet_type_id: Optional[uuid.UUID] = Query(None, description="Filter by wallet type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """List wallet accounts with pagination and filtering."""
    wallet_service = WalletService(db)
    skip = (page - 1) * page_size
    items, total = wallet_service.get_wallet_accounts(
        skip=skip,
        limit=page_size,
        search=q,
        wallet_type_id=wallet_type_id,
        is_active=is_active,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/accounts", response_model=WalletAccountResponse)
def create_wallet_account(
    request: Request,
    account_in: WalletAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Create a new wallet account."""
    wallet_service = WalletService(db)
    wallet = wallet_service.create_wallet_account(obj_in=account_in)
    
    AuditLogService.log(
        db=db, action="CREATE", entity_type="WALLET", entity_id=str(wallet.id),
        new_values=account_in.model_dump(), user_id=current_user.id, request=request
    )
    return wallet

@router.put("/accounts/{account_id}", response_model=WalletAccountResponse)
def update_wallet_account(
    request: Request,
    account_id: uuid.UUID,
    account_in: WalletAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Update a wallet account."""
    wallet_service = WalletService(db)
    old_wallet = wallet_service.get_wallet_account(id=account_id)
    old_values = {"account_name": old_wallet.account_name, "account_number": old_wallet.account_number, "balance": str(old_wallet.balance)} if old_wallet else None
    
    wallet = wallet_service.update_wallet_account(id=account_id, obj_in=account_in)
    
    AuditLogService.log(
        db=db, action="UPDATE", entity_type="WALLET", entity_id=str(wallet.id),
        old_values=old_values, new_values=account_in.model_dump(exclude_unset=True), 
        user_id=current_user.id, request=request
    )
    return wallet

@router.post("/accounts/{account_id}/activate", response_model=WalletAccountResponse)
def activate_wallet_account(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Activate a wallet account."""
    wallet_service = WalletService(db)
    return wallet_service.toggle_status(id=account_id, is_active=True)

@router.post("/accounts/{account_id}/deactivate", response_model=WalletAccountResponse)
def deactivate_wallet_account(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Deactivate a wallet account."""
    wallet_service = WalletService(db)
    return wallet_service.toggle_status(id=account_id, is_active=False)
