from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class AlertItem(BaseModel):
    id: str
    type: str  # low_stock, out_of_stock, pending_po, pending_so, overdue_invoice, urgent_pr
    title: str
    description: str
    severity: str  # critical, warning, info
    link: Optional[str] = None
    created_at: Optional[str] = None

class KPICard(BaseModel):
    title: str
    value: Any
    change: Optional[str] = None
    change_type: Optional[str] = None  # positive, negative, neutral
    prefix: Optional[str] = None
    suffix: Optional[str] = None

class ChartDataPoint(BaseModel):
    name: str
    value: float
    value2: Optional[float] = None
    category: Optional[str] = None

class TopProductItem(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    quantity_sold: float
    revenue: float

class LowStockProductItem(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    current_stock: float
    min_stock_level: float
    reorder_level: float
    uom: str
    status: str

class DashboardData(BaseModel):
    total_products: int
    total_inventory_value: float
    total_stock_quantity: float
    low_stock_items_count: int
    pending_po_count: int
    pending_so_count: int
    total_vendors: int
    total_customers: int
    today_sales: float
    monthly_sales: float
    monthly_purchases: float
    gross_revenue: float
    
    monthly_sales_chart: List[Dict[str, Any]]
    sales_vs_purchases_chart: List[Dict[str, Any]]
    inventory_by_category_chart: List[Dict[str, Any]]
    top_selling_products: List[TopProductItem]
    low_stock_products: List[LowStockProductItem]
    
    recent_purchase_orders: List[Dict[str, Any]]
    recent_sales_orders: List[Dict[str, Any]]
    recent_stock_movements: List[Dict[str, Any]]
    recent_invoices: List[Dict[str, Any]]
    alerts: List[AlertItem]
