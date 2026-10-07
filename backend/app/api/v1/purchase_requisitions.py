from datetime import date
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.purchase import PurchaseRequisition, PRStatus, PRPriority
from app.models.user import User, UserRole
from app.schemas.purchase import PRCreate, PRUpdate, PRResponse, POResponse
from app.services.procurement_service import create_pr, approve_pr, convert_pr_to_po
from app.services.audit_service import log_audit

router = APIRouter()

class PRConvertRequest(BaseModel):
    vendor_id: int
    expected_delivery_date: date
    shipping_address: str

def serialize_pr(pr: PurchaseRequisition) -> dict:
    return {
        "id": pr.id,
        "pr_number": pr.pr_number,
        "requested_by_id": pr.requested_by_id,
        "requested_by_name": pr.requested_by.full_name if pr.requested_by else "Unknown",
        "department": pr.department,
        "status": pr.status,
        "priority": pr.priority,
        "request_date": pr.request_date,
        "required_date": pr.required_date,
        "reason": pr.reason,
        "items": [
            {
                "id": it.id,
                "material_id": it.material_id,
                "material_code": it.material.material_code if it.material else f"ID {it.material_id}",
                "material_name": it.material.name if it.material else "Unknown",
                "uom": it.material.uom if it.material else "PC",
                "quantity": it.quantity,
                "estimated_unit_price": it.estimated_unit_price,
                "notes": it.notes
            }
            for it in pr.items
        ],
        "created_at": pr.created_at,
        "updated_at": pr.updated_at
    }

@router.get("", response_model=List[PRResponse])
def get_purchase_requisitions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    query = db.query(PurchaseRequisition)
    if status:
        query = query.filter(PurchaseRequisition.status == status)
    prs = query.order_by(desc(PurchaseRequisition.created_at)).all()
    return [serialize_pr(pr) for pr in prs]

@router.get("/{id}", response_model=PRResponse)
def get_purchase_requisition(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found")
    return serialize_pr(pr)

@router.post("", response_model=PRResponse)
def create_purchase_requisition(
    pr_in: PRCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    pr = create_pr(db=db, pr_in=pr_in, user=current_user)
    return serialize_pr(pr)

@router.put("/{id}/approve", response_model=PRResponse)
def approve_purchase_requisition(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    pr = approve_pr(db=db, pr_id=id, user=current_user)
    return serialize_pr(pr)

@router.put("/{id}/reject", response_model=PRResponse)
def reject_purchase_requisition(
    id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found")
    pr.status = PRStatus.REJECTED
    if reason:
        pr.reason = f"{pr.reason or ''} [Rejected: {reason}]"
    db.commit()
    db.refresh(pr)

    log_audit(
        db=db,
        action="REJECT_PR",
        module="Purchase Requisition",
        record_id=pr.pr_number,
        description=f"{current_user.full_name} rejected PR {pr.pr_number}",
        user=current_user
    )
    return serialize_pr(pr)

@router.post("/{id}/convert-to-po")
def convert_to_po_endpoint(
    id: int,
    req: PRConvertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    """Convert an approved Purchase Requisition directly into a Purchase Order."""
    po = convert_pr_to_po(
        db=db,
        pr_id=id,
        vendor_id=req.vendor_id,
        expected_delivery_date=req.expected_delivery_date,
        shipping_address=req.shipping_address,
        user=current_user
    )
    return {
        "message": "PR successfully converted to Purchase Order",
        "po_id": po.id,
        "po_number": po.po_number,
        "total_amount": po.total_amount
    }
