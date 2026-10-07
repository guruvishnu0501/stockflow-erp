from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.purchase import GoodsReceipt
from app.models.user import User, UserRole
from app.schemas.purchase import GRCreate, GRResponse
from app.services.procurement_service import process_goods_receipt

router = APIRouter()

def serialize_gr(gr: GoodsReceipt) -> dict:
    return {
        "id": gr.id,
        "gr_number": gr.gr_number,
        "po_id": gr.po_id,
        "po_number": gr.purchase_order.po_number if gr.purchase_order else "Unknown",
        "vendor_id": gr.vendor_id,
        "vendor_name": gr.vendor.company_name if gr.vendor else "Unknown",
        "warehouse_id": gr.warehouse_id,
        "warehouse_name": gr.warehouse.name if gr.warehouse else "Unknown",
        "receipt_date": gr.receipt_date,
        "received_by_id": gr.received_by_id,
        "received_by_name": gr.received_by.full_name if gr.received_by else "Unknown",
        "notes": gr.notes,
        "items": [
            {
                "id": it.id,
                "po_item_id": it.po_item_id,
                "material_id": it.material_id,
                "material_code": it.material.material_code if it.material else f"ID {it.material_id}",
                "material_name": it.material.name if it.material else "Unknown",
                "uom": it.material.uom if it.material else "PC",
                "received_quantity": it.received_quantity,
                "rejected_quantity": it.rejected_quantity,
                "batch_number": it.batch_number,
                "notes": it.notes
            }
            for it in gr.items
        ],
        "created_at": gr.created_at
    }

@router.get("", response_model=List[GRResponse])
def get_goods_receipts(
    po_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    query = db.query(GoodsReceipt)
    if po_id:
        query = query.filter(GoodsReceipt.po_id == po_id)
    if warehouse_id:
        query = query.filter(GoodsReceipt.warehouse_id == warehouse_id)

    grs = query.order_by(desc(GoodsReceipt.created_at)).all()
    return [serialize_gr(gr) for gr in grs]

@router.get("/{id}", response_model=GRResponse)
def get_goods_receipt(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    gr = db.query(GoodsReceipt).filter(GoodsReceipt.id == id).first()
    if not gr:
        raise HTTPException(status_code=404, detail="Goods Receipt not found")
    return serialize_gr(gr)

@router.post("", response_model=GRResponse)
def create_goods_receipt(
    gr_in: GRCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER, UserRole.INVENTORY_MANAGER]))
) -> Any:
    """Post Goods Receipt (SAP MM MIGO) against Purchase Order."""
    gr = process_goods_receipt(db=db, gr_in=gr_in, user=current_user)
    return serialize_gr(gr)
