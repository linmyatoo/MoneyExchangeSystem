import uuid
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.credit import Credit
from app.models.credit_payment import CreditPayment
from app.repositories.credit_payment_repository import CreditPaymentRepository
from app.repositories.credit_repository import CreditRepository
from app.schemas.credit import CreditCreate, CreditPaymentCreate, CreditUpdate


class CreditService:
    def __init__(self, db: Session):
        self.db = db
        self.credit_repo = CreditRepository(db)
        self.payment_repo = CreditPaymentRepository(db)

    def get_credits(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        is_overdue: Optional[bool] = None,
    ) -> Tuple[List[Credit], int]:
        return self.credit_repo.get_paginated_credits(
            skip=skip,
            limit=limit,
            search=search,
            customer_id=customer_id,
            status=status_filter,
            is_overdue=is_overdue,
        )

    def get_credit(self, id: uuid.UUID) -> Credit:
        credit = self.credit_repo.get_by_id(id)
        if not credit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit record not found",
            )
        return credit

    def create_credit(self, obj_in: CreditCreate, created_by: uuid.UUID) -> Credit:
        data = obj_in.model_dump()
        data["remaining_amount"] = data["amount"]
        data["status"] = "pending"
        data["created_by"] = created_by
        return self.credit_repo.create(data)

    def update_credit(self, id: uuid.UUID, obj_in: CreditUpdate) -> Credit:
        credit = self.get_credit(id)
        return self.credit_repo.update(
            db_obj=credit, obj_in=obj_in.model_dump(exclude_unset=True)
        )

    def receive_payment(
        self, credit_id: uuid.UUID, payment_in: CreditPaymentCreate, created_by: uuid.UUID
    ) -> CreditPayment:
        credit = self.get_credit(credit_id)

        if payment_in.amount > credit.remaining_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount cannot exceed the remaining balance",
            )

        # Create payment record
        payment_data = payment_in.model_dump()
        payment_data.update(
            {
                "credit_id": credit_id,
                "created_by": created_by,
            }
        )
        payment = self.payment_repo.create(payment_data)

        # Update credit status
        credit.remaining_amount -= payment.amount
        if credit.remaining_amount == 0:
            credit.status = "paid"
        else:
            credit.status = "partial"
            
        self.db.add(credit)
        self.db.commit()
        self.db.refresh(credit)

        return payment

    def get_payments(self, credit_id: uuid.UUID) -> List[CreditPayment]:
        # Ensure credit exists
        self.get_credit(credit_id)
        return self.payment_repo.get_payments_for_credit(credit_id)
