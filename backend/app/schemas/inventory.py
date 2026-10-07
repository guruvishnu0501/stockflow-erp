from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.inventory import MovementType

class InventoryResponse(BaseModel):
    id: int
    material_id: int
    material_code: str
    material_name: str
    warehouse_id: int
    warehouse_name: str
    quantity_on_hand: float
    quantity_reserved: float
    quantity_available: float
    batch_number: Optional[str] = None
    uom: str
    updated_at: datetime

    class Config:
        from_attributes = True

class StockAdjustmentRequest(BaseModel):
    material_id: int
    warehouse_id: int
    new_quantity: float
    reason: str
    batch_number: Optional[str] = "BATCH-ADJ"
    notes: Optional[str] = None

class StockTransferRequest(BaseModel):
    material_id: int
    source_warehouse_id: int
    dest_warehouse_id: int
    quantity: float
    batch_number: Optional[str] = None
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    movement_type: MovementType
    material_id: int
    material_code: str
    material_name: str
    warehouse_id: int
    warehouse_name: str
    dest_warehouse_id: Optional[int] = None
    dest_warehouse_name: Optional[str] = None
    quantity: float
    balance_after: float
    batch_number: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    username: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
