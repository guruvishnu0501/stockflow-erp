from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.partner import PartnerStatus

# Vendor Schemas
class VendorBase(BaseModel):
    code: str
    company_name: str
    contact_person: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    tax_id: Optional[str] = None
    payment_terms: str = "Net 30"
    status: PartnerStatus = PartnerStatus.ACTIVE

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = None
    status: Optional[PartnerStatus] = None

class VendorResponse(VendorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Customer Schemas
class CustomerBase(BaseModel):
    code: str
    customer_name: str
    contact_person: Optional[str] = None
    company_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    tax_id: Optional[str] = None
    credit_limit: float = 100000.0
    payment_terms: str = "Net 30"
    status: PartnerStatus = PartnerStatus.ACTIVE

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    contact_person: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    credit_limit: Optional[float] = None
    payment_terms: Optional[str] = None
    status: Optional[PartnerStatus] = None

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
