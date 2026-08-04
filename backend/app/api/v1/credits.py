import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_user, get_db
from app.models.user import User
from app.schemas.user import PaginatedResponse
from app.schemas.credit import (
    CreditCreate,
    CreditPaymentCreate,
    CreditPaymentResponse,
    CreditResponse,
    CreditUpdate,
)
from app.services.credit_service import CreditService
from app.services.audit_log_service import AuditLogService

router = APIRouter()
admin_staff_roles = RoleChecker(["admin", "staff"])


@router.get("", response_model=PaginatedResponse[CreditResponse])
def list_credits(
    q: Optional[str] = Query(None, description="Search by description"),
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer"),
    status: Optional[str] = Query(None, description="Filter by status"),
    is_overdue: Optional[bool] = Query(None, description="Filter by overdue status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """List credits with pagination and filtering."""
    credit_service = CreditService(db)
    skip = (page - 1) * page_size
    items, total = credit_service.get_credits(
        skip=skip,
        limit=page_size,
        search=q,
        customer_id=customer_id,
        status_filter=status,
        is_overdue=is_overdue,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=CreditResponse)
def create_credit(
    credit_in: CreditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Create a new credit record."""
    credit_service = CreditService(db)
    return credit_service.create_credit(obj_in=credit_in, created_by=current_user.id)


@router.put("/{credit_id}", response_model=CreditResponse)
def update_credit(
    credit_id: uuid.UUID,
    credit_in: CreditUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Update a credit record."""
    credit_service = CreditService(db)
    return credit_service.update_credit(id=credit_id, obj_in=credit_in)


@router.post("/{credit_id}/payments", response_model=CreditPaymentResponse)
def receive_payment(
    request: Request,
    credit_id: uuid.UUID,
    payment_in: CreditPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Receive a payment for a specific credit."""
    credit_service = CreditService(db)
    payment = credit_service.receive_payment(
        credit_id=credit_id, payment_in=payment_in, created_by=current_user.id
    )
    
    AuditLogService.log(
        db=db, action="RECEIVE_PAYMENT", entity_type="CREDIT", entity_id=str(credit_id),
        new_values=payment_in.model_dump(), user_id=current_user.id, request=request
    )
    return payment


@router.get("/{credit_id}/payments", response_model=List[CreditPaymentResponse])
def get_credit_payments(
    credit_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Get all payments for a specific credit."""
    credit_service = CreditService(db)
    return credit_service.get_payments(credit_id=credit_id)
