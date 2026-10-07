from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.purchase import PRStatus, PRPriority, POStatus

# PR Schemas
class PRItemCreate(BaseModel):
    material_id: int
    quantity: float
    estimated_unit_price: float = 0.0
    notes: Optional[str] = None

class PRItemResponse(BaseModel):
    id: int
    material_id: int
    material_code: str
    material_name: str
    uom: str
    quantity: float
    estimated_unit_price: float
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class PRCreate(BaseModel):
    department: str = "Procurement"
    priority: PRPriority = PRPriority.MEDIUM
    required_date: date
    reason: Optional[str] = None
    items: List[PRItemCreate]

class PRUpdate(BaseModel):
    department: Optional[str] = None
    priority: Optional[PRPriority] = None
    required_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[PRStatus] = None

class PRResponse(BaseModel):
    id: int
    pr_number: str
    requested_by_id: int
    requested_by_name: str
    department: str
    status: PRStatus
    priority: PRPriority
    request_date: date
    required_date: date
    reason: Optional[str] = None
    items: List[PRItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# PO Schemas
class POItemCreate(BaseModel):
    material_id: int
    quantity: float
    unit_price: float
    tax_rate: float = 18.0
    discount_percent: float = 0.0

class POItemResponse(BaseModel):
    id: int
    material_id: int
    material_code: str
    material_name: str
    uom: str
    quantity: float
    received_quantity: float
    unit_price: float
    tax_rate: float
    discount_percent: float
    line_total: float

    class Config:
        from_attributes = True

class POCreate(BaseModel):
    vendor_id: int
    pr_id: Optional[int] = None
    expected_delivery_date: date
    currency: str = "USD"
    payment_terms: str = "Net 30"
    shipping_address: str
    notes: Optional[str] = None
    items: List[POItemCreate]

class POUpdate(BaseModel):
    expected_delivery_date: Optional[date] = None
    payment_terms: Optional[str] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[POStatus] = None

class POResponse(BaseModel):
    id: int
    po_number: str
    vendor_id: int
    vendor_name: str
    pr_id: Optional[int] = None
    created_by_id: int
    created_by_name: str
    po_date: date
    expected_delivery_date: date
    currency: str
    payment_terms: str
    shipping_address: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: POStatus
    notes: Optional[str] = None
    items: List[POItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Goods Receipt Schemas
class GRItemCreate(BaseModel):
    po_item_id: int
    material_id: int
    received_quantity: float
    rejected_quantity: float = 0.0
    batch_number: Optional[str] = "BATCH-001"
    notes: Optional[str] = None

class GRItemResponse(BaseModel):
    id: int
    po_item_id: int
    material_id: int
    material_code: str
    material_name: str
    uom: str
    received_quantity: float
    rejected_quantity: float
    batch_number: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class GRCreate(BaseModel):
    po_id: int
    warehouse_id: int
    receipt_date: Optional[date] = None
    notes: Optional[str] = None
    items: List[GRItemCreate]

class GRResponse(BaseModel):
    id: int
    gr_number: str
    po_id: int
    po_number: str
    vendor_id: int
    vendor_name: str
    warehouse_id: int
    warehouse_name: str
    receipt_date: date
    received_by_id: int
    received_by_name: str
    notes: Optional[str] = None
    items: List[GRItemResponse]
    created_at: datetime

    class Config:
        from_attributes = True
