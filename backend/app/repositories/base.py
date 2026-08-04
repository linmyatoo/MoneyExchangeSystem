"""Base repository with common CRUD operations."""
import uuid
from typing import Generic, List, Optional, Type, TypeVar

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: uuid.UUID) -> Optional[ModelType]:
        return (
            self.db.query(self.model)
            .filter(self.model.id == id, self.model.deleted_at == None)
            .first()
        )

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ModelType]:
        return (
            self.db.query(self.model)
            .filter(self.model.deleted_at == None)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(self) -> int:
        return (
            self.db.query(func.count(self.model.id))
            .filter(self.model.deleted_at == None)
            .scalar()
        )

    def create(self, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            if value is not None:
                setattr(db_obj, field, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def soft_delete(self, db_obj: ModelType) -> ModelType:
        from datetime import datetime
        db_obj.deleted_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def hard_delete(self, db_obj: ModelType) -> None:
        self.db.delete(db_obj)
        self.db.commit()
