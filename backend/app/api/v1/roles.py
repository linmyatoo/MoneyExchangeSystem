"""Role management API endpoints (Admin only)."""
import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.repositories.role_repository import RoleRepository
from app.schemas.user import RoleCreate, RoleResponse, RoleUpdate

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


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Get a specific role (Admin only)."""
    repo = RoleRepository(db)
    role = repo.get_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )
    return role


@router.post("", response_model=RoleResponse, status_code=201)
def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Create a new role (Admin only)."""
    repo = RoleRepository(db)
    existing = repo.get_by_name(role_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists",
        )
    return repo.create(role_in.dict())


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: uuid.UUID,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Update a role (Admin only)."""
    repo = RoleRepository(db)
    role = repo.get_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role_in.name:
        existing = repo.get_by_name(role_in.name)
        if existing and existing.id != role_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists",
            )

    update_data = {k: v for k, v in role_in.dict().items() if v is not None}
    return repo.update(role, update_data)


@router.delete("/{role_id}", response_model=RoleResponse)
def delete_role(
    role_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Soft delete a role (Admin only)."""
    repo = RoleRepository(db)
    role = repo.get_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )
    return repo.soft_delete(role)
