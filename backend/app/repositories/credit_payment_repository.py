import uuid
from typing import List

from sqlalchemy.orm import Session

from app.models.credit_payment import CreditPayment
from app.repositories.base import BaseRepository


class CreditPaymentRepository(BaseRepository[CreditPayment]):
    def __init__(self, db: Session):
        super().__init__(CreditPayment, db)

    def get_payments_for_credit(self, credit_id: uuid.UUID) -> List[CreditPayment]:
        return (
            self.db.query(CreditPayment)
            .filter(CreditPayment.credit_id == credit_id, CreditPayment.deleted_at.is_(None))
            .order_by(CreditPayment.payment_date.desc())
            .all()
        )
