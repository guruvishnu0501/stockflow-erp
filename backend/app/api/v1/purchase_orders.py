from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.purchase import PurchaseOrder, POStatus
from app.models.user import User, UserRole
from app.schemas.purchase import POCreate, POUpdate, POResponse
from app.services.procurement_service import create_po, approve_po
from app.services.audit_service import log_audit

router = APIRouter()

def serialize_po(po: PurchaseOrder) -> dict:
    return {
        "id": po.id,
        "po_number": po.po_number,
        "vendor_id": po.vendor_id,
        "vendor_name": po.vendor.company_name if po.vendor else "Unknown",
        "pr_id": po.pr_id,
        "created_by_id": po.created_by_id,
        "created_by_name": po.created_by.full_name if po.created_by else "Unknown",
        "po_date": po.po_date,
        "expected_delivery_date": po.expected_delivery_date,
        "currency": po.currency,
        "payment_terms": po.payment_terms,
        "shipping_address": po.shipping_address,
        "subtotal": po.subtotal,
        "tax_amount": po.tax_amount,
        "discount_amount": po.discount_amount,
        "total_amount": po.total_amount,
        "status": po.status,
        "notes": po.notes,
        "items": [
            {
                "id": it.id,
                "material_id": it.material_id,
                "material_code": it.material.material_code if it.material else f"ID {it.material_id}",
                "material_name": it.material.name if it.material else "Unknown",
                "uom": it.material.uom if it.material else "PC",
                "quantity": it.quantity,
                "received_quantity": it.received_quantity,
                "unit_price": it.unit_price,
                "tax_rate": it.tax_rate,
                "discount_percent": it.discount_percent,
                "line_total": it.line_total
            }
            for it in po.items
        ],
        "created_at": po.created_at,
        "updated_at": po.updated_at
    }

@router.get("", response_model=List[POResponse])
def get_purchase_orders(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    query = db.query(PurchaseOrder)

    if status:
        query = query.filter(PurchaseOrder.status == status)
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    if search:
        query = query.filter(PurchaseOrder.po_number.ilike(f"%{search}%"))

    pos = query.order_by(desc(PurchaseOrder.created_at)).offset(skip).limit(limit).all()
    return [serialize_po(po) for po in pos]

@router.get("/{id}", response_model=POResponse)
def get_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return serialize_po(po)

@router.post("", response_model=POResponse)
def create_purchase_order(
    po_in: POCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    po = create_po(db=db, po_in=po_in, user=current_user)
    return serialize_po(po)

@router.put("/{id}/approve", response_model=POResponse)
def approve_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    po = approve_po(db=db, po_id=id, user=current_user)
    return serialize_po(po)

@router.put("/{id}/send-to-vendor", response_model=POResponse)
def send_po_to_vendor(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.status != POStatus.APPROVED:
        raise HTTPException(status_code=400, detail="PO must be approved before sending to vendor")

    po.status = POStatus.SENT_TO_VENDOR
    db.commit()
    db.refresh(po)

    log_audit(
        db=db,
        action="SEND_PO",
        module="Purchase Order",
        record_id=po.po_number,
        description=f"{current_user.full_name} marked PO {po.po_number} as Sent to Vendor",
        user=current_user
    )
    return serialize_po(po)

@router.put("/{id}/cancel", response_model=POResponse)
def cancel_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.status in [POStatus.FULLY_RECEIVED, POStatus.PARTIALLY_RECEIVED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a PO that has already received items")

    po.status = POStatus.CANCELLED
    db.commit()
    db.refresh(po)

    log_audit(
        db=db,
        action="CANCEL_PO",
        module="Purchase Order",
        record_id=po.po_number,
        description=f"{current_user.full_name} cancelled Purchase Order {po.po_number}",
        user=current_user
    )
    return serialize_po(po)
