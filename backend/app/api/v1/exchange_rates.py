from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_user, get_db
from app.models.user import User
from app.schemas.exchange_rate import ExchangeRateCreate, ExchangeRateResponse
from app.schemas.user import PaginatedResponse
from app.services.exchange_rate_service import ExchangeRateService
from app.services.audit_log_service import AuditLogService

router = APIRouter()
admin_staff_roles = RoleChecker(["admin", "staff"])


@router.get("/current", response_model=ExchangeRateResponse)
def get_current_rate(
    currency_code: str = Query("THB", description="Currency Code"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Get the currently active exchange rate for a currency."""
    service = ExchangeRateService(db)
    return service.get_active_rate(currency_code)


@router.get("", response_model=PaginatedResponse[ExchangeRateResponse])
def get_rate_history(
    currency_code: Optional[str] = Query(None, description="Filter by Currency Code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Get the history of exchange rates."""
    service = ExchangeRateService(db)
    skip = (page - 1) * page_size
    items, total = service.get_rate_history(
        currency_code=currency_code, skip=skip, limit=page_size
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=ExchangeRateResponse)
def set_new_rate(
    request: Request,
    rate_in: ExchangeRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Set a new exchange rate. This will deactivate the currently active rate."""
    service = ExchangeRateService(db)
    rate = service.set_new_rate(obj_in=rate_in, created_by=current_user.id)
    
    AuditLogService.log(
        db=db, action="RATE_CHANGE", entity_type="EXCHANGE_RATE", entity_id=str(rate.id),
        new_values=rate_in.model_dump(), user_id=current_user.id, request=request
    )
    return rate
