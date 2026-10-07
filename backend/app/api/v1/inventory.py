from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.inventory import Inventory, StockMovement, MovementType
from app.models.material import Material, StockStatus
from app.models.warehouse import Warehouse
from app.models.user import User, UserRole
from app.schemas.inventory import (
    InventoryResponse, StockAdjustmentRequest, StockTransferRequest, StockMovementResponse
)
from app.services.inventory_service import adjust_stock, transfer_stock

router = APIRouter()

@router.get("", response_model=List[InventoryResponse])
def get_inventory(
    warehouse_id: Optional[int] = None,
    material_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get warehouse inventory balances."""
    query = db.query(Inventory)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    if material_id:
        query = query.filter(Inventory.material_id == material_id)

    records = query.all()
    results = []
    for inv in records:
        mat = inv.material
        wh = inv.warehouse
        results.append({
            "id": inv.id,
            "material_id": inv.material_id,
            "material_code": mat.material_code if mat else f"ID {inv.material_id}",
            "material_name": mat.name if mat else "Unknown",
            "warehouse_id": inv.warehouse_id,
            "warehouse_name": wh.name if wh else f"WH {inv.warehouse_id}",
            "quantity_on_hand": inv.quantity_on_hand,
            "quantity_reserved": inv.quantity_reserved,
            "quantity_available": inv.quantity_available,
            "batch_number": inv.batch_number,
            "uom": mat.uom if mat else "PC",
            "updated_at": inv.updated_at
        })
    return results

@router.get("/movements", response_model=List[StockMovementResponse])
def get_stock_movements(
    skip: int = 0,
    limit: int = 50,
    material_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve immutable stock movements ledger."""
    query = db.query(StockMovement)

    if material_id:
        query = query.filter(StockMovement.material_id == material_id)
    if warehouse_id:
        query = query.filter(
            or_(
                StockMovement.warehouse_id == warehouse_id,
                StockMovement.dest_warehouse_id == warehouse_id
            )
        )
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)

    movements = query.order_by(desc(StockMovement.created_at)).offset(skip).limit(limit).all()

    results = []
    for sm in movements:
        results.append({
            "id": sm.id,
            "movement_type": sm.movement_type,
            "material_id": sm.material_id,
            "material_code": sm.material.material_code if sm.material else "Unknown",
            "material_name": sm.material.name if sm.material else "Unknown",
            "warehouse_id": sm.warehouse_id,
            "warehouse_name": sm.warehouse.name if sm.warehouse else "Unknown",
            "dest_warehouse_id": sm.dest_warehouse_id,
            "dest_warehouse_name": sm.dest_warehouse.name if sm.dest_warehouse else None,
            "quantity": sm.quantity,
            "balance_after": sm.balance_after,
            "batch_number": sm.batch_number,
            "reference_type": sm.reference_type,
            "reference_id": sm.reference_id,
            "reason": sm.reason,
            "notes": sm.notes,
            "username": sm.created_by.username if sm.created_by else "SYSTEM",
            "created_at": sm.created_at
        })
    return results

@router.post("/adjust")
def adjust_stock_endpoint(
    adj_in: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
) -> Any:
    """Manually adjust stock with mandatory reason and immutable audit record."""
    movement = adjust_stock(
        db=db,
        material_id=adj_in.material_id,
        warehouse_id=adj_in.warehouse_id,
        new_quantity=adj_in.new_quantity,
        reason=adj_in.reason,
        notes=adj_in.notes,
        user=current_user
    )
    db.commit()
    return {
        "message": "Stock adjusted successfully",
        "movement_id": movement.id,
        "new_balance": movement.balance_after
    }

@router.post("/transfer")
def transfer_stock_endpoint(
    trf_in: StockTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
) -> Any:
    """Transfer inventory between warehouses."""
    movement = transfer_stock(
        db=db,
        material_id=trf_in.material_id,
        source_warehouse_id=trf_in.source_warehouse_id,
        dest_warehouse_id=trf_in.dest_warehouse_id,
        quantity=trf_in.quantity,
        notes=trf_in.notes,
        user=current_user
    )
    db.commit()
    return {
        "message": "Stock transferred successfully",
        "movement_id": movement.id,
        "quantity": movement.quantity
    }
