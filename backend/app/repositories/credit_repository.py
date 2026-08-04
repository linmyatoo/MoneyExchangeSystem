import uuid
from typing import List, Optional, Tuple
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.credit import Credit
from app.repositories.base import BaseRepository


class CreditRepository(BaseRepository[Credit]):
    def __init__(self, db: Session):
        super().__init__(Credit, db)

    def get_paginated_credits(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        is_overdue: Optional[bool] = None,
    ) -> Tuple[List[Credit], int]:
        query = self.db.query(Credit).filter(Credit.deleted_at.is_(None))

        if search:
            search_term = f"%{search}%"
            query = query.filter(Credit.description.ilike(search_term))

        if customer_id:
            query = query.filter(Credit.customer_id == customer_id)
            
        if status:
            query = query.filter(Credit.status == status)

        if is_overdue is not None:
            now = datetime.utcnow()
            if is_overdue:
                query = query.filter(
                    Credit.status != "paid",
                    Credit.due_date.isnot(None),
                    Credit.due_date < now
                )
            else:
                query = query.filter(
                    or_(
                        Credit.status == "paid",
                        Credit.due_date.is_(None),
                        Credit.due_date >= now
                    )
                )

        total = query.count()
        items = query.order_by(Credit.created_at.desc()).offset(skip).limit(limit).all()

        return items, total
