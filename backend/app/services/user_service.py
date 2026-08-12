"""User service with business logic."""
import uuid
from typing import Optional, Tuple, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.role_repository import RoleRepository
from app.schemas.user import UserCreate, UserUpdate


ADMIN_ROLE_NAME = "admin"


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    def _ensure_not_self(
        self, user_id: uuid.UUID, acting_user_id: uuid.UUID, action: str
    ) -> None:
        """Block an admin from locking themselves out of their own account."""
        if user_id == acting_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You cannot {action} your own account.",
            )

    def _ensure_not_last_active_admin(self, user: User, action: str) -> None:
        """Block the removal of the only admin who can still sign in.

        Recovering from that state needs direct database access, so it is
        refused outright. A user who is already inactive or soft-deleted is not
        holding the system open, so acting on them is always allowed.
        """
        is_active_admin = (
            user.is_active
            and not user.is_deleted
            and user.role is not None
            and user.role.name == ADMIN_ROLE_NAME
        )
        if not is_active_admin:
            return

        if self.user_repo.count_active_admins(exclude_user_id=user.id) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot {action} the last active admin — the system would "
                    "be left with no one who can sign in. Give another user the "
                    "admin role first."
                ),
            )

    def get_user(self, user_id: uuid.UUID) -> User:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    def search_users(
        self,
        query: Optional[str] = None,
        role_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[User], int]:
        skip = (page - 1) * page_size
        return self.user_repo.search(
            query=query,
            role_id=role_id,
            is_active=is_active,
            skip=skip,
            limit=page_size,
        )

    def create_user(self, user_in: UserCreate) -> User:
        # Check username uniqueness
        existing = self.user_repo.get_by_username(user_in.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        # Check email uniqueness
        if user_in.email:
            existing_email = self.user_repo.get_by_email(user_in.email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )

        # Validate role exists
        role = self.role_repo.get_by_id(user_in.role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role_id",
            )

        user_data = {
            "username": user_in.username,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "full_name": user_in.full_name,
            "role_id": user_in.role_id,
            "is_active": True,
        }

        return self.user_repo.create(user_data)

    def update_user(
        self, user_id: uuid.UUID, user_in: UserUpdate, acting_user_id: uuid.UUID
    ) -> User:
        user = self.get_user(user_id)

        # Clearing is_active through the generic update is the same lockout as
        # calling /deactivate, so it gets the same guards.
        if user_in.is_active is False:
            self._ensure_not_self(user_id, acting_user_id, "deactivate")
            self._ensure_not_last_active_admin(user, "deactivate")

        update_data = {}

        if user_in.email is not None:
            # Check email uniqueness (excluding current user)
            existing = self.user_repo.get_by_email(user_in.email)
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
            update_data["email"] = user_in.email

        if user_in.full_name is not None:
            update_data["full_name"] = user_in.full_name

        if user_in.password is not None:
            update_data["hashed_password"] = get_password_hash(user_in.password)

        if user_in.is_active is not None:
            update_data["is_active"] = user_in.is_active

        if not update_data:
            return user

        return self.user_repo.update(user, update_data)

    def reset_password(self, user_id: uuid.UUID, new_password: str) -> User:
        user = self.get_user(user_id)
        hashed = get_password_hash(new_password)
        return self.user_repo.update(user, {"hashed_password": hashed})

    def activate_user(self, user_id: uuid.UUID) -> User:
        user = self.get_user(user_id)
        if user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already active",
            )
        return self.user_repo.update(user, {"is_active": True})

    def deactivate_user(self, user_id: uuid.UUID, acting_user_id: uuid.UUID) -> User:
        user = self.get_user(user_id)
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already inactive",
            )
        self._ensure_not_self(user_id, acting_user_id, "deactivate")
        self._ensure_not_last_active_admin(user, "deactivate")
        return self.user_repo.update(user, {"is_active": False})

    def delete_user(self, user_id: uuid.UUID, acting_user_id: uuid.UUID) -> User:
        user = self.get_user(user_id)
        self._ensure_not_self(user_id, acting_user_id, "delete")
        self._ensure_not_last_active_admin(user, "delete")
        return self.user_repo.soft_delete(user)
