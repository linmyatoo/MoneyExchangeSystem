"""User management API endpoints (Admin only)."""
import math
import uuid
from typing import Any, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query, Request
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db, get_current_active_user
from app.models.user import User
from app.schemas.user import (
    PaginatedResponse,
    ResetPasswordRequest,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.user_service import UserService
from app.services.audit_log_service import AuditLogService

router = APIRouter()

admin_only = RoleChecker(["admin"])


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    q: Optional[str] = Query(None, description="Search by username, name, or email"),
    role_id: Optional[uuid.UUID] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """List users with search and pagination (Admin only)."""
    service = UserService(db)
    users, total = service.search_users(
        query=q, role_id=role_id, is_active=is_active,
        page=page, page_size=page_size,
    )
    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 0,
    }


@router.post("", response_model=UserResponse, status_code=201)
def create_user(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Create new user."""
    service = UserService(db)
    user = service.create_user(user_in)
    
    AuditLogService.log(
        db=db, action="CREATE", entity_type="USER", entity_id=str(user.id),
        new_values=user_in.model_dump(exclude={"password"}),
        user_id=current_user.id, request=request
    )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Update a user (Admin only)."""
    service = UserService(db)
    return service.update_user(user_id, user_in, acting_user_id=current_user.id)


@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    request: Request,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Deactivate user (soft delete)."""
    service = UserService(db)
    user = service.delete_user(user_id, acting_user_id=current_user.id)
    
    AuditLogService.log(
        db=db, action="DELETE", entity_type="USER", entity_id=str(user.id),
        user_id=current_user.id, request=request
    )
    return user


@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_password(
    user_id: uuid.UUID,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Reset a user's password (Admin only)."""
    service = UserService(db)
    return service.reset_password(user_id, body.new_password)


@router.post("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Activate a user (Admin only)."""
    service = UserService(db)
    return service.activate_user(user_id)


@router.post("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(admin_only),
) -> Any:
    """Deactivate a user (Admin only)."""
    service = UserService(db)
    return service.deactivate_user(user_id, acting_user_id=current_user.id)
