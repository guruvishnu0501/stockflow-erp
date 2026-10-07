from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.material import Material, Category, StockStatus
from app.models.inventory import Inventory, StockMovement, MovementType
from app.models.partner import Vendor, Customer
from app.models.purchase import PurchaseOrder, POStatus
from app.models.sales import SalesOrder, SalesOrderItem, SOStatus
from app.models.invoice import Invoice, InvoiceType, PaymentStatus
from app.schemas.dashboard import DashboardData, AlertItem, TopProductItem, LowStockProductItem

def get_dashboard_metrics(db: Session) -> DashboardData:
    today = datetime.now(timezone.utc).date()
    start_of_month = today.replace(day=1)
    
    # Material and Inventory stats
    total_products = db.query(Material).filter(Material.is_active == True).count()
    
    inventories = db.query(Inventory).all()
    total_stock_qty = sum(inv.quantity_on_hand for inv in inventories)
    
    materials = db.query(Material).filter(Material.is_active == True).all()
    total_inv_value = 0.0
    low_stock_list: List[LowStockProductItem] = []
    
    for mat in materials:
        curr_stock = mat.total_stock
        total_inv_value += curr_stock * mat.purchase_price
        
        status_val = mat.stock_status.value
        if status_val in ["Low Stock", "Out of Stock"]:
            low_stock_list.append(LowStockProductItem(
                material_id=mat.id,
                material_code=mat.material_code,
                material_name=mat.name,
                current_stock=curr_stock,
                min_stock_level=mat.min_stock_level,
                reorder_level=mat.reorder_level,
                uom=mat.uom,
                status=status_val
            ))

    low_stock_count = len(low_stock_list)
    total_vendors = db.query(Vendor).count()
    total_customers = db.query(Customer).count()

    # Pending Orders
    pending_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_([POStatus.PENDING_APPROVAL, POStatus.DRAFT, POStatus.SENT_TO_VENDOR])
    ).count()

    pending_sos = db.query(SalesOrder).filter(
        SalesOrder.status.in_([SOStatus.CONFIRMED, SOStatus.PROCESSING, SOStatus.DRAFT])
    ).count()

    # Sales & Revenue calculations
    today_sales_sum = db.query(func.sum(SalesOrder.total_amount)).filter(
        SalesOrder.order_date == today,
        SalesOrder.status != SOStatus.CANCELLED
    ).scalar() or 0.0

    monthly_sales_sum = db.query(func.sum(SalesOrder.total_amount)).filter(
        SalesOrder.order_date >= start_of_month,
        SalesOrder.status != SOStatus.CANCELLED
    ).scalar() or 0.0

    monthly_purchases_sum = db.query(func.sum(PurchaseOrder.total_amount)).filter(
        PurchaseOrder.po_date >= start_of_month,
        PurchaseOrder.status != POStatus.CANCELLED
    ).scalar() or 0.0

    gross_revenue = db.query(func.sum(Invoice.paid_amount)).filter(
        Invoice.invoice_type == InvoiceType.SALES
    ).scalar() or 0.0

    # Monthly Trends (last 6 months)
    sales_vs_purchases_chart = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for i in range(5, -1, -1):
        m_date = today - timedelta(days=i*30)
        m_name = month_names[m_date.month - 1]
        
        # approximate aggregate for that month
        m_start = m_date.replace(day=1)
        # next month
        if m_date.month == 12:
            m_end = m_date.replace(year=m_date.year + 1, month=1, day=1)
        else:
            m_end = m_date.replace(month=m_date.month + 1, day=1)

        m_sales = db.query(func.sum(SalesOrder.total_amount)).filter(
            SalesOrder.order_date >= m_start,
            SalesOrder.order_date < m_end,
            SalesOrder.status != SOStatus.CANCELLED
        ).scalar() or 0.0

        m_purchases = db.query(func.sum(PurchaseOrder.total_amount)).filter(
            PurchaseOrder.po_date >= m_start,
            PurchaseOrder.po_date < m_end,
            PurchaseOrder.status != POStatus.CANCELLED
        ).scalar() or 0.0

        sales_vs_purchases_chart.append({
            "month": m_name,
            "sales": round(float(m_sales), 2),
            "purchases": round(float(m_purchases), 2)
        })

    # Inventory by category
    category_chart = []
    categories = db.query(Category).all()
    for cat in categories:
        cat_mats = db.query(Material).filter(Material.category_id == cat.id).all()
        cat_val = sum(m.total_stock * m.purchase_price for m in cat_mats)
        cat_qty = sum(m.total_stock for m in cat_mats)
        if cat_val > 0 or cat_qty > 0:
            category_chart.append({
                "name": cat.name,
                "value": round(cat_val, 2),
                "quantity": cat_qty
            })

    # Top Selling Products
    top_items_query = db.query(
        SalesOrderItem.material_id,
        func.sum(SalesOrderItem.quantity).label("total_qty"),
        func.sum(SalesOrderItem.line_total).label("total_rev")
    ).group_by(SalesOrderItem.material_id).order_by(func.sum(SalesOrderItem.line_total).desc()).limit(5).all()

    top_selling_products: List[TopProductItem] = []
    for item in top_items_query:
        m = db.query(Material).filter(Material.id == item.material_id).first()
        if m:
            top_selling_products.append(TopProductItem(
                material_id=m.id,
                material_code=m.material_code,
                material_name=m.name,
                quantity_sold=float(item.total_qty),
                revenue=round(float(item.total_rev), 2)
            ))

    # Recent lists
    recent_pos = []
    for po in db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).limit(5).all():
        recent_pos.append({
            "id": po.id,
            "po_number": po.po_number,
            "vendor_name": po.vendor.company_name if po.vendor else "Unknown",
            "po_date": str(po.po_date),
            "total_amount": po.total_amount,
            "status": po.status.value
        })

    recent_sos = []
    for so in db.query(SalesOrder).order_by(SalesOrder.created_at.desc()).limit(5).all():
        recent_sos.append({
            "id": so.id,
            "so_number": so.so_number,
            "customer_name": so.customer.customer_name if so.customer else "Unknown",
            "order_date": str(so.order_date),
            "total_amount": so.total_amount,
            "status": so.status.value
        })

    recent_movements = []
    for sm in db.query(StockMovement).order_by(StockMovement.created_at.desc()).limit(6).all():
        recent_movements.append({
            "id": sm.id,
            "movement_type": sm.movement_type.value,
            "material_name": sm.material.name if sm.material else "Unknown",
            "quantity": sm.quantity,
            "reference_id": sm.reference_id,
            "created_at": sm.created_at.strftime("%Y-%m-%d %H:%M")
        })

    recent_invs = []
    for inv in db.query(Invoice).order_by(Invoice.created_at.desc()).limit(5).all():
        recent_invs.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_type": inv.invoice_type.value,
            "party_name": inv.customer.customer_name if inv.customer else (inv.vendor.company_name if inv.vendor else "Unknown"),
            "total_amount": inv.total_amount,
            "payment_status": inv.payment_status.value
        })

    # Alerts
    alerts: List[AlertItem] = []
    for l_item in low_stock_list[:4]:
        alerts.append(AlertItem(
            id=f"alert-stock-{l_item.material_id}",
            type="low_stock" if l_item.status == "Low Stock" else "out_of_stock",
            title=f"{l_item.status}: {l_item.material_name}",
            description=f"Current: {l_item.current_stock} {l_item.uom}. Reorder level is {l_item.reorder_level}.",
            severity="critical" if l_item.status == "Out of Stock" else "warning",
            link="/materials"
        ))

    if pending_pos > 0:
        alerts.append(AlertItem(
            id="alert-pending-po",
            type="pending_po",
            title=f"{pending_pos} Purchase Orders Awaiting Action",
            description="Purchase orders need approval or goods receipt follow-up.",
            severity="info",
            link="/purchase-orders"
        ))

    # Overdue invoices
    overdue_count = db.query(Invoice).filter(
        Invoice.payment_status != PaymentStatus.PAID,
        Invoice.due_date < today
    ).count()
    if overdue_count > 0:
        alerts.append(AlertItem(
            id="alert-overdue-inv",
            type="overdue_invoice",
            title=f"{overdue_count} Overdue Invoices",
            description="Receivables or payables past their payment due date.",
            severity="warning",
            link="/invoices"
        ))

    return DashboardData(
        total_products=total_products,
        total_inventory_value=round(total_inv_value, 2),
        total_stock_quantity=round(total_stock_qty, 2),
        low_stock_items_count=low_stock_count,
        pending_po_count=pending_pos,
        pending_so_count=pending_sos,
        total_vendors=total_vendors,
        total_customers=total_customers,
        today_sales=round(float(today_sales_sum), 2),
        monthly_sales=round(float(monthly_sales_sum), 2),
        monthly_purchases=round(float(monthly_purchases_sum), 2),
        gross_revenue=round(float(gross_revenue), 2),
        monthly_sales_chart=sales_vs_purchases_chart,
        sales_vs_purchases_chart=sales_vs_purchases_chart,
        inventory_by_category_chart=category_chart,
        top_selling_products=top_selling_products,
        low_stock_products=low_stock_list[:6],
        recent_purchase_orders=recent_pos,
        recent_sales_orders=recent_sos,
        recent_stock_movements=recent_movements,
        recent_invoices=recent_invs,
        alerts=alerts
    )
