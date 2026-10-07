from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardData
from app.services.dashboard_service import get_dashboard_metrics

router = APIRouter()

@router.get("", response_model=DashboardData)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve full ERP dashboard KPIs, charts, recent activities, and alerts."""
    return get_dashboard_metrics(db)
