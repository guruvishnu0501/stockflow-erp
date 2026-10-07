from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.invoice import InvoiceType, PaymentStatus

class InvoiceItemCreate(BaseModel):
    material_id: Optional[int] = None
    description: str
    quantity: float
    unit_price: float
    tax_rate: float = 18.0

class InvoiceItemResponse(BaseModel):
    id: int
    material_id: Optional[int] = None
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    line_total: float

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    invoice_type: InvoiceType
    customer_id: Optional[int] = None
    vendor_id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    due_date: date
    notes: Optional[str] = None
    items: List[InvoiceItemCreate]

class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str = "Bank Transfer"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    payment_date: Optional[date] = None

class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    payment_date: date
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_type: InvoiceType
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    invoice_date: date
    due_date: date
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    paid_amount: float
    balance_due: float
    payment_status: PaymentStatus
    notes: Optional[str] = None
    items: List[InvoiceItemResponse]
    payments: List[PaymentResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
