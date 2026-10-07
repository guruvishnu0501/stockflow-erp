from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.material import StockStatus

class CategoryBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MaterialBase(BaseModel):
    material_code: str
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory: Optional[str] = None
    sku: str
    uom: str = "PC"
    purchase_price: float = 0.0
    selling_price: float = 0.0
    tax_rate: float = 18.0
    min_stock_level: float = 10.0
    max_stock_level: float = 1000.0
    reorder_level: float = 25.0
    default_warehouse_id: Optional[int] = None
    primary_vendor_id: Optional[int] = None
    is_active: bool = True

class MaterialCreate(MaterialBase):
    initial_stock: Optional[float] = 0.0

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    tax_rate: Optional[float] = None
    min_stock_level: Optional[float] = None
    max_stock_level: Optional[float] = None
    reorder_level: Optional[float] = None
    default_warehouse_id: Optional[int] = None
    primary_vendor_id: Optional[int] = None
    is_active: Optional[bool] = None

class MaterialResponse(MaterialBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_stock: float = 0.0
    stock_status: StockStatus = StockStatus.OUT_OF_STOCK
    category_name: Optional[str] = None
    warehouse_name: Optional[str] = None
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True
