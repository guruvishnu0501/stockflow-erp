from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.sales import SOStatus, DeliveryStatus

# Sales Order Schemas
class SOItemCreate(BaseModel):
    material_id: int
    quantity: float
    unit_price: float
    discount_percent: float = 0.0
    tax_rate: float = 18.0

class SOItemResponse(BaseModel):
    id: int
    material_id: int
    material_code: str
    material_name: str
    uom: str
    quantity: float
    delivered_quantity: float
    unit_price: float
    discount_percent: float
    tax_rate: float
    line_total: float

    class Config:
        from_attributes = True

class SOCreate(BaseModel):
    customer_id: int
    requested_delivery_date: date
    shipping_address: str
    notes: Optional[str] = None
    items: List[SOItemCreate]

class SOUpdate(BaseModel):
    requested_delivery_date: Optional[date] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[SOStatus] = None

class SOResponse(BaseModel):
    id: int
    so_number: str
    customer_id: int
    customer_name: str
    created_by_id: int
    created_by_name: str
    order_date: date
    requested_delivery_date: date
    shipping_address: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: SOStatus
    notes: Optional[str] = None
    items: List[SOItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Delivery Schemas
class DeliveryItemCreate(BaseModel):
    so_item_id: int
    material_id: int
    quantity: float
    batch_number: Optional[str] = "BATCH-DEFAULT"

class DeliveryItemResponse(BaseModel):
    id: int
    so_item_id: int
    material_id: int
    material_code: str
    material_name: str
    uom: str
    quantity: float
    batch_number: Optional[str] = None

    class Config:
        from_attributes = True

class DeliveryCreate(BaseModel):
    so_id: int
    warehouse_id: int
    delivery_date: Optional[date] = None
    shipping_notes: Optional[str] = None
    items: List[DeliveryItemCreate]

class DeliveryUpdate(BaseModel):
    status: Optional[DeliveryStatus] = None
    shipping_notes: Optional[str] = None

class DeliveryResponse(BaseModel):
    id: int
    delivery_number: str
    so_id: int
    so_number: str
    customer_id: int
    customer_name: str
    warehouse_id: int
    warehouse_name: str
    delivery_date: date
    status: DeliveryStatus
    shipping_notes: Optional[str] = None
    created_by_id: int
    created_by_name: str
    items: List[DeliveryItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
