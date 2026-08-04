"""User repository for data access."""
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_username(self, username: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.username == username, User.deleted_at == None)
            .first()
        )

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email, User.deleted_at == None)
            .first()
        )

    def search(
        self,
        query: Optional[str] = None,
        role_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[User], int]:
        """Search users with filters and return (results, total_count)."""
        base_query = self.db.query(User).filter(User.deleted_at == None)

        if query:
            search_term = f"%{query}%"
            base_query = base_query.filter(
                or_(
                    User.username.ilike(search_term),
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        if role_id:
            base_query = base_query.filter(User.role_id == role_id)

        if is_active is not None:
            base_query = base_query.filter(User.is_active == is_active)

        total = base_query.count()
        results = (
            base_query
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return results, total
