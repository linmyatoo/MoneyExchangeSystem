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


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

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

    def update_user(self, user_id: uuid.UUID, user_in: UserUpdate) -> User:
        user = self.get_user(user_id)

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

    def deactivate_user(self, user_id: uuid.UUID) -> User:
        user = self.get_user(user_id)
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already inactive",
            )
        return self.user_repo.update(user, {"is_active": False})

    def delete_user(self, user_id: uuid.UUID) -> User:
        user = self.get_user(user_id)
        return self.user_repo.soft_delete(user)
