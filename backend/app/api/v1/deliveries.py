from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.sales import Delivery, DeliveryStatus
from app.models.user import User, UserRole
from app.schemas.sales import DeliveryCreate, DeliveryUpdate, DeliveryResponse
from app.services.sales_service import create_delivery, post_goods_issue

router = APIRouter()

def serialize_delivery(deliv: Delivery) -> dict:
    return {
        "id": deliv.id,
        "delivery_number": deliv.delivery_number,
        "so_id": deliv.so_id,
        "so_number": deliv.sales_order.so_number if deliv.sales_order else "Unknown",
        "customer_id": deliv.customer_id,
        "customer_name": deliv.customer.customer_name if deliv.customer else "Unknown",
        "warehouse_id": deliv.warehouse_id,
        "warehouse_name": deliv.warehouse.name if deliv.warehouse else "Unknown",
        "delivery_date": deliv.delivery_date,
        "status": deliv.status,
        "shipping_notes": deliv.shipping_notes,
        "created_by_id": deliv.created_by_id,
        "created_by_name": deliv.created_by.full_name if deliv.created_by else "Unknown",
        "items": [
            {
                "id": it.id,
                "so_item_id": it.so_item_id,
                "material_id": it.material_id,
                "material_code": it.material.material_code if it.material else f"ID {it.material_id}",
                "material_name": it.material.name if it.material else "Unknown",
                "uom": it.material.uom if it.material else "PC",
                "quantity": it.quantity,
                "batch_number": it.batch_number
            }
            for it in deliv.items
        ],
        "created_at": deliv.created_at,
        "updated_at": deliv.updated_at
    }

@router.get("", response_model=List[DeliveryResponse])
def get_deliveries(
    so_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    query = db.query(Delivery)
    if so_id:
        query = query.filter(Delivery.so_id == so_id)
    if status:
        query = query.filter(Delivery.status == status)

    deliveries = query.order_by(desc(Delivery.created_at)).all()
    return [serialize_delivery(d) for d in deliveries]

@router.get("/{id}", response_model=DeliveryResponse)
def get_delivery(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    delivery = db.query(Delivery).filter(Delivery.id == id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return serialize_delivery(delivery)

@router.post("", response_model=DeliveryResponse)
def create_delivery_endpoint(
    del_in: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.INVENTORY_MANAGER]))
) -> Any:
    """Create Outbound Delivery (SAP SD VL01N)."""
    delivery = create_delivery(db=db, del_in=del_in, user=current_user)
    return serialize_delivery(delivery)

@router.post("/{id}/post-goods-issue", response_model=DeliveryResponse)
def post_goods_issue_endpoint(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.INVENTORY_MANAGER]))
) -> Any:
    """
    Post Goods Issue (SAP SD PGI / Goods Issue).
    Deducts stock, creates immutable StockMovement record, and generates customer invoice.
    """
    delivery = post_goods_issue(db=db, delivery_id=id, user=current_user)
    return serialize_delivery(delivery)
