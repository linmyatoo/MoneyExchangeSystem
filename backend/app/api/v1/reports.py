from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.schemas.report import (
    ProfitReportResponse,
    WalletBalanceReportResponse,
    CashFlowReportResponse,
)
from app.services.report_service import ReportService

router = APIRouter()
admin_roles = RoleChecker(["admin"])


@router.get("/profit", response_model=ProfitReportResponse)
def get_profit_report(
    start_date: date = Query(..., description="Start date for report"),
    end_date: date = Query(..., description="End date for report"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_roles),
) -> Any:
    """Generate Profit Report. (Admin only)"""
    service = ReportService(db)
    return service.generate_profit_report(start_date, end_date)


@router.get("/wallet-balances", response_model=WalletBalanceReportResponse)
def get_wallet_balances_report(
    db: Session = Depends(get_db),
    _: User = Depends(admin_roles),
) -> Any:
    """Generate Wallet Balances Snapshot Report. (Admin only)"""
    service = ReportService(db)
    return service.generate_wallet_balances_report()


@router.get("/cash-flow", response_model=CashFlowReportResponse)
def get_cash_flow_report(
    start_date: date = Query(..., description="Start date for report"),
    end_date: date = Query(..., description="End date for report"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_roles),
) -> Any:
    """Generate Cash Flow Report. (Admin only)"""
    service = ReportService(db)
    return service.generate_cash_flow_report(start_date, end_date)
