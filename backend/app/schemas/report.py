from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SalesReportItem(BaseModel):
    period: str
    order_count: int
    items_sold: float
    total_sales: float
    average_order_value: float

class ProductSalesReportItem(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    category: str
    units_sold: float
    total_revenue: float
    current_stock: float

class CustomerSalesReportItem(BaseModel):
    customer_id: int
    customer_name: str
    company_name: Optional[str] = None
    order_count: int
    total_spend: float

class PurchaseReportItem(BaseModel):
    period: str
    po_count: int
    total_purchases: float
    completed_orders: int
    pending_orders: int

class VendorPurchaseReportItem(BaseModel):
    vendor_id: int
    vendor_name: str
    po_count: int
    total_purchased: float
    completed_pos: int

class InventoryValuationItem(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    category: str
    warehouse: str
    quantity_on_hand: float
    uom: str
    purchase_price: float
    selling_price: float
    total_cost_value: float
    potential_sales_value: float
    stock_status: str
