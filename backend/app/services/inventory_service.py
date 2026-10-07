from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.inventory import Inventory, StockMovement, MovementType
from app.models.material import Material, StockStatus
from app.models.warehouse import Warehouse
from app.models.user import User
from app.services.audit_service import log_audit

def get_or_create_inventory(db: Session, material_id: int, warehouse_id: int) -> Inventory:
    """Retrieve or initialize an inventory record for material at specific warehouse."""
    inv = db.query(Inventory).filter(
        Inventory.material_id == material_id,
        Inventory.warehouse_id == warehouse_id
    ).first()
    
    if not inv:
        inv = Inventory(
            material_id=material_id,
            warehouse_id=warehouse_id,
            quantity_on_hand=0.0,
            quantity_reserved=0.0
        )
        db.add(inv)
        db.flush()
    return inv

def check_stock_availability(
    db: Session,
    material_id: int,
    requested_quantity: float,
    warehouse_id: Optional[int] = None
) -> Tuple[bool, float]:
    """
    Check if requested quantity is available for material.
    Returns (is_available, available_quantity).
    """
    query = db.query(Inventory).filter(Inventory.material_id == material_id)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    
    inventories = query.all()
    available_qty = sum(inv.quantity_available for inv in inventories)
    return (available_qty >= requested_quantity, available_qty)

def record_goods_receipt_stock(
    db: Session,
    material_id: int,
    warehouse_id: int,
    quantity: float,
    batch_number: Optional[str] = "BATCH-001",
    reference_id: Optional[str] = None,
    user: Optional[User] = None,
    notes: Optional[str] = None
) -> StockMovement:
    """
    Increase inventory when goods are received (SAP MM Goods Receipt / MIGO).
    Creates an immutable StockMovement record.
    """
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Received quantity must be greater than zero"
        )

    inv = get_or_create_inventory(db, material_id, warehouse_id)
    inv.quantity_on_hand += quantity
    if batch_number:
        inv.batch_number = batch_number
    db.flush()

    # Create immutable Stock Movement record
    movement = StockMovement(
        movement_type=MovementType.GOODS_RECEIPT,
        material_id=material_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        balance_after=inv.quantity_on_hand,
        batch_number=batch_number,
        reference_type="Purchase Order",
        reference_id=reference_id,
        reason="Goods Receipt from Vendor",
        notes=notes,
        created_by_id=user.id if user else None
    )
    db.add(movement)
    db.flush()

    material = db.query(Material).filter(Material.id == material_id).first()
    mat_code = material.material_code if material else f"ID {material_id}"
    log_audit(
        db=db,
        action="RECEIVE_GOODS",
        module="Inventory",
        record_id=reference_id or str(movement.id),
        description=f"Received {quantity} units of {mat_code} into warehouse {warehouse_id}",
        user=user,
        new_values={"material_id": material_id, "warehouse_id": warehouse_id, "quantity": quantity, "new_balance": inv.quantity_on_hand}
    )

    return movement

def record_goods_issue_stock(
    db: Session,
    material_id: int,
    warehouse_id: int,
    quantity: float,
    batch_number: Optional[str] = None,
    reference_id: Optional[str] = None,
    user: Optional[User] = None,
    notes: Optional[str] = None
) -> StockMovement:
    """
    Decrease inventory when goods are issued for delivery (SAP SD Goods Issue / PGI).
    Creates an immutable StockMovement record.
    Prevents negative stock!
    """
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goods issue quantity must be greater than zero"
        )

    inv = get_or_create_inventory(db, material_id, warehouse_id)
    if inv.quantity_on_hand < quantity:
        material = db.query(Material).filter(Material.id == material_id).first()
        mat_name = material.name if material else f"ID {material_id}"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient inventory for '{mat_name}'. Available: {inv.quantity_on_hand}, Requested: {quantity}"
        )

    inv.quantity_on_hand -= quantity
    # If reserved stock exists, release from reservation
    if inv.quantity_reserved >= quantity:
        inv.quantity_reserved -= quantity
    else:
        inv.quantity_reserved = 0.0
    db.flush()

    # Create immutable Stock Movement record
    movement = StockMovement(
        movement_type=MovementType.GOODS_ISSUE,
        material_id=material_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        balance_after=inv.quantity_on_hand,
        batch_number=batch_number or inv.batch_number,
        reference_type="Sales Order Delivery",
        reference_id=reference_id,
        reason="Goods Issue for Outbound Delivery",
        notes=notes,
        created_by_id=user.id if user else None
    )
    db.add(movement)
    db.flush()

    material = db.query(Material).filter(Material.id == material_id).first()
    mat_code = material.material_code if material else f"ID {material_id}"
    log_audit(
        db=db,
        action="ISSUE_GOODS",
        module="Inventory",
        record_id=reference_id or str(movement.id),
        description=f"Issued {quantity} units of {mat_code} for delivery {reference_id}",
        user=user,
        new_values={"material_id": material_id, "warehouse_id": warehouse_id, "quantity": quantity, "new_balance": inv.quantity_on_hand}
    )

    return movement

def adjust_stock(
    db: Session,
    material_id: int,
    warehouse_id: int,
    new_quantity: float,
    reason: str,
    notes: Optional[str] = None,
    user: Optional[User] = None
) -> StockMovement:
    """
    Manually adjust stock level with mandatory reason and immutable audit record.
    """
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock quantity cannot be negative"
        )

    inv = get_or_create_inventory(db, material_id, warehouse_id)
    old_qty = inv.quantity_on_hand
    delta = new_quantity - old_qty

    inv.quantity_on_hand = new_quantity
    db.flush()

    movement = StockMovement(
        movement_type=MovementType.ADJUSTMENT,
        material_id=material_id,
        warehouse_id=warehouse_id,
        quantity=abs(delta),
        balance_after=new_quantity,
        batch_number=inv.batch_number,
        reference_type="Physical Inventory Adjustment",
        reference_id=f"ADJ-{inv.id}",
        reason=reason,
        notes=notes or f"Stock adjusted from {old_qty} to {new_quantity}",
        created_by_id=user.id if user else None
    )
    db.add(movement)
    db.flush()

    material = db.query(Material).filter(Material.id == material_id).first()
    mat_code = material.material_code if material else f"ID {material_id}"
    log_audit(
        db=db,
        action="STOCK_ADJUSTMENT",
        module="Inventory",
        record_id=f"ADJ-{inv.id}",
        description=f"Adjusted stock for {mat_code} from {old_qty} to {new_quantity}. Reason: {reason}",
        user=user,
        old_values={"quantity": old_qty},
        new_values={"quantity": new_quantity, "reason": reason}
    )

    return movement

def transfer_stock(
    db: Session,
    material_id: int,
    source_warehouse_id: int,
    dest_warehouse_id: int,
    quantity: float,
    notes: Optional[str] = None,
    user: Optional[User] = None
) -> StockMovement:
    """
    Transfer stock between warehouses with atomic inventory deduction and addition.
    """
    if source_warehouse_id == dest_warehouse_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination warehouses cannot be the same"
        )
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer quantity must be greater than zero"
        )

    source_inv = get_or_create_inventory(db, material_id, source_warehouse_id)
    if source_inv.quantity_on_hand < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock in source warehouse. Available: {source_inv.quantity_on_hand}, Requested: {quantity}"
        )

    dest_inv = get_or_create_inventory(db, material_id, dest_warehouse_id)

    source_inv.quantity_on_hand -= quantity
    dest_inv.quantity_on_hand += quantity
    dest_inv.batch_number = source_inv.batch_number
    db.flush()

    movement = StockMovement(
        movement_type=MovementType.TRANSFER,
        material_id=material_id,
        warehouse_id=source_warehouse_id,
        dest_warehouse_id=dest_warehouse_id,
        quantity=quantity,
        balance_after=source_inv.quantity_on_hand,
        batch_number=source_inv.batch_number,
        reference_type="Inter-Warehouse Transfer",
        reference_id=f"TRF-{source_warehouse_id}-{dest_warehouse_id}",
        reason=f"Transfer from WH {source_warehouse_id} to WH {dest_warehouse_id}",
        notes=notes,
        created_by_id=user.id if user else None
    )
    db.add(movement)
    db.flush()

    material = db.query(Material).filter(Material.id == material_id).first()
    mat_code = material.material_code if material else f"ID {material_id}"
    log_audit(
        db=db,
        action="TRANSFER_STOCK",
        module="Inventory",
        record_id=f"TRF-{movement.id}",
        description=f"Transferred {quantity} units of {mat_code} from warehouse {source_warehouse_id} to {dest_warehouse_id}",
        user=user,
        new_values={"from_warehouse": source_warehouse_id, "to_warehouse": dest_warehouse_id, "quantity": quantity}
    )

    return movement
