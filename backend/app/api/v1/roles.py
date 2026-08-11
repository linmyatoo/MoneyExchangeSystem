"""Role management API endpoints (Admin only)."""
from typing import Any, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.repositories.role_repository import RoleRepository
from app.schemas.user import RoleResponse

router = APIRouter()

admin_only = RoleChecker(["admin"])


@router.get("", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """List all roles (Admin only)."""
    repo = RoleRepository(db)
    return repo.get_all_active()
