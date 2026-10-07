from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.sales import SalesOrder, SOStatus
from app.models.user import User, UserRole
from app.schemas.sales import SOCreate, SOUpdate, SOResponse
from app.services.sales_service import create_sales_order
from app.services.audit_service import log_audit

router = APIRouter()

def serialize_so(so: SalesOrder) -> dict:
    return {
        "id": so.id,
        "so_number": so.so_number,
        "customer_id": so.customer_id,
        "customer_name": so.customer.customer_name if so.customer else "Unknown",
        "created_by_id": so.created_by_id,
        "created_by_name": so.created_by.full_name if so.created_by else "Unknown",
        "order_date": so.order_date,
        "requested_delivery_date": so.requested_delivery_date,
        "shipping_address": so.shipping_address,
        "subtotal": so.subtotal,
        "tax_amount": so.tax_amount,
        "discount_amount": so.discount_amount,
        "total_amount": so.total_amount,
        "status": so.status,
        "notes": so.notes,
        "items": [
            {
                "id": it.id,
                "material_id": it.material_id,
                "material_code": it.material.material_code if it.material else f"ID {it.material_id}",
                "material_name": it.material.name if it.material else "Unknown",
                "uom": it.material.uom if it.material else "PC",
                "quantity": it.quantity,
                "delivered_quantity": it.delivered_quantity,
                "unit_price": it.unit_price,
                "discount_percent": it.discount_percent,
                "tax_rate": it.tax_rate,
                "line_total": it.line_total
            }
            for it in so.items
        ],
        "created_at": so.created_at,
        "updated_at": so.updated_at
    }

@router.get("", response_model=List[SOResponse])
def get_sales_orders(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    query = db.query(SalesOrder)

    if status:
        query = query.filter(SalesOrder.status == status)
    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)
    if search:
        query = query.filter(SalesOrder.so_number.ilike(f"%{search}%"))

    sos = query.order_by(desc(SalesOrder.created_at)).offset(skip).limit(limit).all()
    return [serialize_so(so) for so in sos]

@router.get("/{id}", response_model=SOResponse)
def get_sales_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    so = db.query(SalesOrder).filter(SalesOrder.id == id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")
    return serialize_so(so)

@router.post("", response_model=SOResponse)
def create_sales_order_endpoint(
    so_in: SOCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER]))
) -> Any:
    """Create Sales Order (SAP SD VA01) with ATP Stock Availability check."""
    so = create_sales_order(db=db, so_in=so_in, user=current_user)
    return serialize_so(so)

@router.put("/{id}/cancel", response_model=SOResponse)
def cancel_sales_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER]))
) -> Any:
    so = db.query(SalesOrder).filter(SalesOrder.id == id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")
    if so.status in [SOStatus.DELIVERED, SOStatus.PARTIALLY_DELIVERED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a sales order that has delivered goods")

    so.status = SOStatus.CANCELLED
    db.commit()
    db.refresh(so)

    log_audit(
        db=db,
        action="CANCEL_SALES_ORDER",
        module="Sales Order",
        record_id=so.so_number,
        description=f"{current_user.full_name} cancelled Sales Order {so.so_number}",
        user=current_user
    )
    return serialize_so(so)
