"""Role repository for data access."""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.role import Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    def __init__(self, db: Session):
        super().__init__(Role, db)

    def get_by_name(self, name: str) -> Optional[Role]:
        return (
            self.db.query(Role)
            .filter(Role.name == name, Role.deleted_at == None)
            .first()
        )

    def get_all_active(self) -> List[Role]:
        return (
            self.db.query(Role)
            .filter(Role.deleted_at == None)
            .order_by(Role.name)
            .all()
        )
