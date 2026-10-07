from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.warehouse import Warehouse, WarehouseStatus
from app.models.inventory import Inventory
from app.models.material import Material
from app.models.user import User, UserRole
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from app.services.audit_service import log_audit

router = APIRouter()

@router.get("", response_model=List[WarehouseResponse])
def get_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return db.query(Warehouse).order_by(Warehouse.code.asc()).all()

@router.get("/{id}", response_model=WarehouseResponse)
def get_warehouse(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return wh

@router.get("/{id}/inventory")
def get_warehouse_inventory(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    inventories = db.query(Inventory).filter(Inventory.warehouse_id == id).all()
    result = []
    total_qty = 0.0
    total_val = 0.0

    for inv in inventories:
        mat = inv.material
        if mat:
            cost = inv.quantity_on_hand * mat.purchase_price
            total_qty += inv.quantity_on_hand
            total_val += cost
            result.append({
                "material_id": mat.id,
                "material_code": mat.material_code,
                "material_name": mat.name,
                "uom": mat.uom,
                "quantity_on_hand": inv.quantity_on_hand,
                "quantity_reserved": inv.quantity_reserved,
                "quantity_available": inv.quantity_available,
                "batch_number": inv.batch_number,
                "valuation": round(cost, 2),
                "stock_status": mat.stock_status.value
            })

    return {
        "warehouse": wh,
        "total_items_count": len(result),
        "total_stock_quantity": round(total_qty, 2),
        "total_valuation": round(total_val, 2),
        "items": result
    }

@router.post("", response_model=WarehouseResponse)
def create_warehouse(
    wh_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    existing = db.query(Warehouse).filter(Warehouse.code == wh_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already exists")

    wh = Warehouse(**wh_in.model_dump())
    db.add(wh)
    db.commit()
    db.refresh(wh)

    log_audit(
        db=db,
        action="CREATE_WAREHOUSE",
        module="Warehouse Master",
        record_id=wh.code,
        description=f"{current_user.full_name} created warehouse {wh.code} - {wh.name}",
        user=current_user,
        new_values=wh_in.model_dump()
    )

    return wh

@router.put("/{id}", response_model=WarehouseResponse)
def update_warehouse(
    id: int,
    wh_in: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    update_data = wh_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(wh, field, val)

    db.commit()
    db.refresh(wh)

    log_audit(
        db=db,
        action="UPDATE_WAREHOUSE",
        module="Warehouse Master",
        record_id=wh.code,
        description=f"{current_user.full_name} updated warehouse {wh.code}",
        user=current_user,
        new_values=update_data
    )

    return wh
