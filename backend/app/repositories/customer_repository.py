from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.wallet_transaction import WalletTransaction
from app.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, db: Session):
        super().__init__(Customer, db)

    def get_paginated_customers(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[List[Customer], int]:
        query = self.db.query(Customer).filter(Customer.deleted_at.is_(None))

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Customer.name.ilike(search_term),
                    Customer.phone.ilike(search_term),
                )
            )

        total = query.count()
        items = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()

        # Calculate outstanding credit dynamically from unsettled wallet transactions
        for item in items:
            outstanding = self.db.query(func.sum(WalletTransaction.amount)).filter(
                WalletTransaction.customer_id == item.id,
                WalletTransaction.is_credit.is_(True),
                WalletTransaction.deleted_at.is_(None)
            ).scalar()

            item.outstanding_credit = float(outstanding) if outstanding else 0.00
            item.total_transactions = 0  # Placeholder for Phase 7/9 transactions aggregation

        return items, total

    def get_by_phone(self, phone: str) -> Optional[Customer]:
        return (
            self.db.query(Customer)
            .filter(Customer.phone == phone, Customer.deleted_at.is_(None))
            .first()
        )
