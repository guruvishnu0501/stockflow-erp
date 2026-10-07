from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.material import Material, Category
from app.models.partner import Vendor, Customer
from app.models.purchase import PurchaseOrder, PurchaseOrderItem, POStatus
from app.models.sales import SalesOrder, SalesOrderItem, SOStatus
from app.models.inventory import Inventory, StockMovement, MovementType
from app.models.warehouse import Warehouse

def get_sales_report(
    db: Session,
    period_type: str = "monthly",  # daily, weekly, monthly, yearly
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    query = db.query(SalesOrder).filter(SalesOrder.status != SOStatus.CANCELLED)
    if start_date:
        query = query.filter(SalesOrder.order_date >= start_date)
    if end_date:
        query = query.filter(SalesOrder.order_date <= end_date)

    sos = query.all()
    # Group by period
    grouped: Dict[str, Dict[str, Any]] = {}
    for so in sos:
        if period_type == "daily":
            key = str(so.order_date)
        elif period_type == "weekly":
            key = f"Week {so.order_date.isocalendar()[1]}, {so.order_date.year}"
        elif period_type == "yearly":
            key = str(so.order_date.year)
        else: # monthly
            key = so.order_date.strftime("%B %Y")

        if key not in grouped:
            grouped[key] = {
                "period": key,
                "order_count": 0,
                "items_sold": 0.0,
                "total_sales": 0.0
            }
        grouped[key]["order_count"] += 1
        grouped[key]["total_sales"] += so.total_amount
        grouped[key]["items_sold"] += sum(it.quantity for it in so.items)

    result = list(grouped.values())
    for item in result:
        item["total_sales"] = round(item["total_sales"], 2)
        item["average_order_value"] = round(item["total_sales"] / item["order_count"], 2) if item["order_count"] > 0 else 0.0
    return result

def get_product_sales_report(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    query = db.query(SalesOrderItem).join(SalesOrder).filter(SalesOrder.status != SOStatus.CANCELLED)
    if start_date:
        query = query.filter(SalesOrder.order_date >= start_date)
    if end_date:
        query = query.filter(SalesOrder.order_date <= end_date)

    items = query.all()
    grouped: Dict[int, Dict[str, Any]] = {}
    for item in items:
        mat_id = item.material_id
        if mat_id not in grouped:
            mat = item.material
            grouped[mat_id] = {
                "material_id": mat_id,
                "material_code": mat.material_code if mat else f"ID {mat_id}",
                "material_name": mat.name if mat else "Unknown",
                "category": mat.category.name if (mat and mat.category) else "General",
                "units_sold": 0.0,
                "total_revenue": 0.0,
                "current_stock": mat.total_stock if mat else 0.0,
                "uom": mat.uom if mat else "PC"
            }
        grouped[mat_id]["units_sold"] += item.quantity
        grouped[mat_id]["total_revenue"] += item.line_total

    result = list(grouped.values())
    for r in result:
        r["total_revenue"] = round(r["total_revenue"], 2)
    return sorted(result, key=lambda x: x["total_revenue"], reverse=True)

def get_vendor_purchase_report(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    query = db.query(PurchaseOrder).filter(PurchaseOrder.status != POStatus.CANCELLED)
    if start_date:
        query = query.filter(PurchaseOrder.po_date >= start_date)
    if end_date:
        query = query.filter(PurchaseOrder.po_date <= end_date)

    pos = query.all()
    grouped: Dict[int, Dict[str, Any]] = {}
    for po in pos:
        v_id = po.vendor_id
        if v_id not in grouped:
            vendor = po.vendor
            grouped[v_id] = {
                "vendor_id": v_id,
                "vendor_name": vendor.company_name if vendor else f"ID {v_id}",
                "po_count": 0,
                "total_purchased": 0.0,
                "completed_pos": 0,
                "pending_pos": 0
            }
        grouped[v_id]["po_count"] += 1
        grouped[v_id]["total_purchased"] += po.total_amount
        if po.status == POStatus.FULLY_RECEIVED:
            grouped[v_id]["completed_pos"] += 1
        else:
            grouped[v_id]["pending_pos"] += 1

    result = list(grouped.values())
    for r in result:
        r["total_purchased"] = round(r["total_purchased"], 2)
    return sorted(result, key=lambda x: x["total_purchased"], reverse=True)

def get_inventory_valuation_report(
    db: Session,
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    query = db.query(Material).filter(Material.is_active == True)
    if category_id:
        query = query.filter(Material.category_id == category_id)

    materials = query.all()
    result = []
    for mat in materials:
        inv_query = db.query(Inventory).filter(Inventory.material_id == mat.id)
        if warehouse_id:
            inv_query = inv_query.filter(Inventory.warehouse_id == warehouse_id)

        inv_records = inv_query.all()
        for inv in inv_records:
            qty = inv.quantity_on_hand
            cost_val = qty * mat.purchase_price
            sales_val = qty * mat.selling_price
            result.append({
                "material_id": mat.id,
                "material_code": mat.material_code,
                "material_name": mat.name,
                "category": mat.category.name if mat.category else "General",
                "warehouse": inv.warehouse.name if inv.warehouse else f"WH {inv.warehouse_id}",
                "warehouse_id": inv.warehouse_id,
                "quantity_on_hand": qty,
                "uom": mat.uom,
                "purchase_price": mat.purchase_price,
                "selling_price": mat.selling_price,
                "total_cost_value": round(cost_val, 2),
                "potential_sales_value": round(sales_val, 2),
                "stock_status": mat.stock_status.value
            })

    return result
