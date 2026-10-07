from fastapi import APIRouter
from app.api.v1 import (
    auth, users, materials, categories, vendors, customers,
    warehouses, inventory, purchase_requisitions, purchase_orders,
    goods_receipts, sales_orders, deliveries, invoices,
    dashboard, reports, audit_logs
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(materials.router, prefix="/materials", tags=["Material Master"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendor Master"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customer Master"])
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["Warehouses"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory Management"])
api_router.include_router(purchase_requisitions.router, prefix="/purchase-requisitions", tags=["Purchase Requisitions"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders"])
api_router.include_router(goods_receipts.router, prefix="/goods-receipts", tags=["Goods Receipts"])
api_router.include_router(sales_orders.router, prefix="/sales-orders", tags=["Sales Orders"])
api_router.include_router(deliveries.router, prefix="/deliveries", tags=["Deliveries & Goods Issue"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices & Billing"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Analytics"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Trail"])
