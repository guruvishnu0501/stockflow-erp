import csv
import io
from datetime import date
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.services.report_service import (
    get_sales_report, get_product_sales_report, get_vendor_purchase_report, get_inventory_valuation_report
)

router = APIRouter()

@router.get("/sales")
def sales_report(
    period_type: str = Query("monthly", description="daily, weekly, monthly, yearly"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_sales_report(db, period_type=period_type, start_date=start_date, end_date=end_date)

@router.get("/products")
def product_sales_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_product_sales_report(db, start_date=start_date, end_date=end_date)

@router.get("/purchases")
def vendor_purchase_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_vendor_purchase_report(db, start_date=start_date, end_date=end_date)

@router.get("/inventory")
def inventory_valuation_report(
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_inventory_valuation_report(db, warehouse_id=warehouse_id, category_id=category_id)

@router.get("/inventory/export/csv")
def export_inventory_valuation_csv(
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    data = get_inventory_valuation_report(db, warehouse_id=warehouse_id, category_id=category_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Material Code", "Name", "Category", "Warehouse", "Stock On Hand", 
        "UoM", "Purchase Price", "Selling Price", "Cost Value", "Potential Sales Value", "Status"
    ])
    for row in data:
        writer.writerow([
            row["material_code"],
            row["material_name"],
            row["category"],
            row["warehouse"],
            row["quantity_on_hand"],
            row["uom"],
            row["purchase_price"],
            row["selling_price"],
            row["total_cost_value"],
            row["potential_sales_value"],
            row["stock_status"]
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_valuation_report.csv"}
    )
