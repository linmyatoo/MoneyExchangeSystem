from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()
admin_only = RoleChecker(["admin"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    period: str = Query("daily", description="Time period filter: daily, monthly, yearly"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> Any:
    """Get high-level dashboard summary cards, charts, and recent activity."""
    service = DashboardService(db)
    return service.get_dashboard_summary(period)
