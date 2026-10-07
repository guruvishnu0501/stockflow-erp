from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.partner import Vendor, PartnerStatus
from app.models.purchase import PurchaseOrder, POStatus
from app.models.material import Material
from app.models.user import User, UserRole
from app.schemas.partner import VendorCreate, VendorUpdate, VendorResponse
from app.services.audit_service import log_audit

router = APIRouter()

@router.get("", response_model=List[VendorResponse])
def get_vendors(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve list of vendors with search and filters."""
    query = db.query(Vendor)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Vendor.code.ilike(search_filter),
                Vendor.company_name.ilike(search_filter),
                Vendor.contact_person.ilike(search_filter),
                Vendor.email.ilike(search_filter)
            )
        )

    if status:
        query = query.filter(Vendor.status == status)

    return query.order_by(Vendor.company_name.asc()).offset(skip).limit(limit).all()

@router.get("/{id}", response_model=VendorResponse)
def get_vendor(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    vendor = db.query(Vendor).filter(Vendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.get("/{id}/summary")
def get_vendor_summary(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get vendor performance analytics and purchase history."""
    vendor = db.query(Vendor).filter(Vendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    pos = db.query(PurchaseOrder).filter(PurchaseOrder.vendor_id == id).all()
    total_val = sum(po.total_amount for po in pos if po.status != POStatus.CANCELLED)
    pending_count = sum(1 for po in pos if po.status in [POStatus.PENDING_APPROVAL, POStatus.APPROVED, POStatus.SENT_TO_VENDOR, POStatus.PARTIALLY_RECEIVED])
    completed_count = sum(1 for po in pos if po.status == POStatus.FULLY_RECEIVED)

    supplied_mats = db.query(Material).filter(Material.primary_vendor_id == id).all()

    return {
        "vendor": vendor,
        "total_purchase_value": round(total_val, 2),
        "total_orders_count": len(pos),
        "pending_orders_count": pending_count,
        "completed_orders_count": completed_count,
        "materials_supplied": [
            {"id": m.id, "material_code": m.material_code, "name": m.name, "purchase_price": m.purchase_price}
            for m in supplied_mats
        ],
        "recent_purchase_orders": [
            {
                "id": p.id,
                "po_number": p.po_number,
                "po_date": str(p.po_date),
                "total_amount": p.total_amount,
                "status": p.status.value
            }
            for p in sorted(pos, key=lambda x: x.created_at, reverse=True)[:5]
        ]
    }

@router.post("", response_model=VendorResponse)
def create_vendor(
    v_in: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    existing = db.query(Vendor).filter(Vendor.code == v_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor code already exists")

    vendor = Vendor(**v_in.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    log_audit(
        db=db,
        action="CREATE_VENDOR",
        module="Vendor Master",
        record_id=vendor.code,
        description=f"{current_user.full_name} created vendor {vendor.code} - {vendor.company_name}",
        user=current_user,
        new_values=v_in.model_dump()
    )

    return vendor

@router.put("/{id}", response_model=VendorResponse)
def update_vendor(
    id: int,
    v_in: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    vendor = db.query(Vendor).filter(Vendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    update_data = v_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(vendor, field, val)

    db.commit()
    db.refresh(vendor)

    log_audit(
        db=db,
        action="UPDATE_VENDOR",
        module="Vendor Master",
        record_id=vendor.code,
        description=f"{current_user.full_name} updated vendor {vendor.code}",
        user=current_user,
        new_values=update_data
    )

    return vendor

@router.delete("/{id}")
def deactivate_vendor(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    vendor = db.query(Vendor).filter(Vendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.status = PartnerStatus.INACTIVE
    db.commit()

    log_audit(
        db=db,
        action="DEACTIVATE_VENDOR",
        module="Vendor Master",
        record_id=vendor.code,
        description=f"{current_user.full_name} deactivated vendor {vendor.code}",
        user=current_user
    )
    return {"message": "Vendor deactivated successfully"}
