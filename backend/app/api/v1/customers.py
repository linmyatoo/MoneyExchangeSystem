import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db, get_current_active_user
from app.models.user import User
from app.schemas.user import PaginatedResponse
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.customer_service import CustomerService
from app.services.audit_log_service import AuditLogService

router = APIRouter()
admin_staff_roles = RoleChecker(["admin", "staff"])
admin_only = RoleChecker(["admin"])


@router.get("", response_model=PaginatedResponse[CustomerResponse])
def list_customers(
    q: Optional[str] = Query(None, description="Search by name or phone"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """List customers with pagination and filtering."""
    customer_service = CustomerService(db)
    skip = (page - 1) * page_size
    items, total = customer_service.get_customers(
        skip=skip,
        limit=page_size,
        search=q,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Get a customer by ID."""
    customer_service = CustomerService(db)
    return customer_service.get_customer(id=customer_id)


@router.post("", response_model=CustomerResponse)
def create_customer(
    request: Request,
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Create a new customer."""
    customer_service = CustomerService(db)
    customer = customer_service.create_customer(obj_in=customer_in)
    
    AuditLogService.log(
        db=db, action="CREATE", entity_type="CUSTOMER", entity_id=str(customer.id),
        new_values=customer_in.model_dump(), user_id=current_user.id, request=request
    )
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    request: Request,
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_staff_roles),
) -> Any:
    """Update a customer."""
    customer_service = CustomerService(db)
    old_customer = customer_service.get_customer(id=customer_id)
    old_values = {"name": old_customer.name, "phone": old_customer.phone} if old_customer else None
    
    customer = customer_service.update_customer(id=customer_id, obj_in=customer_in)
    
    AuditLogService.log(
        db=db, action="UPDATE", entity_type="CUSTOMER", entity_id=str(customer.id),
        old_values=old_values, new_values=customer_in.model_dump(exclude_unset=True),
        user_id=current_user.id, request=request
    )
    return customer


@router.delete("/{customer_id}", response_model=CustomerResponse)
def delete_customer(
    request: Request,
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Soft delete a customer (Admin only)."""
    customer_service = CustomerService(db)
    customer = customer_service.delete_customer(id=customer_id)
    
    AuditLogService.log(
        db=db, action="DELETE", entity_type="CUSTOMER", entity_id=str(customer.id),
        user_id=current_user.id, request=request
    )
    return customer
