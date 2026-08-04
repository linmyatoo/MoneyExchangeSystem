import uuid
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:
    def __init__(self, db: Session):
        self.db = db
        self.customer_repo = CustomerRepository(db)

    def get_customers(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[List[Customer], int]:
        return self.customer_repo.get_paginated_customers(
            skip=skip, limit=limit, search=search
        )

    def get_customer(self, id: uuid.UUID) -> Customer:
        customer = self.customer_repo.get_by_id(id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )
        return customer

    def create_customer(self, obj_in: CustomerCreate) -> Customer:
        if obj_in.phone:
            existing_phone = self.customer_repo.get_by_phone(obj_in.phone)
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Customer with this phone number already exists",
                )
        
        customer = self.customer_repo.create(obj_in.model_dump())
        return customer

    def update_customer(
        self, id: uuid.UUID, obj_in: CustomerUpdate
    ) -> Customer:
        customer = self.get_customer(id)

        if obj_in.phone and obj_in.phone != customer.phone:
            existing_phone = self.customer_repo.get_by_phone(obj_in.phone)
            if existing_phone and existing_phone.id != id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Customer with this phone number already exists",
                )

        customer = self.customer_repo.update(
            db_obj=customer, obj_in=obj_in.model_dump(exclude_unset=True)
        )
        return customer

    def delete_customer(self, id: uuid.UUID) -> Customer:
        customer = self.get_customer(id)
        customer = self.customer_repo.soft_delete(customer)
        return customer
