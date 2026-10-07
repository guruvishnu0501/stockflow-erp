from datetime import datetime, date, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.sales import (
    SalesOrder, SalesOrderItem, SOStatus,
    Delivery, DeliveryItem, DeliveryStatus
)
from app.models.material import Material
from app.models.partner import Customer
from app.models.warehouse import Warehouse
from app.models.user import User
from app.models.inventory import Inventory
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, PaymentStatus
from app.schemas.sales import SOCreate, SOUpdate, DeliveryCreate, DeliveryUpdate
from app.services.inventory_service import check_stock_availability, record_goods_issue_stock, get_or_create_inventory
from app.services.procurement_service import generate_document_number
from app.services.audit_service import log_audit

def create_sales_order(db: Session, so_in: SOCreate, user: User) -> SalesOrder:
    """
    Simulates SAP SD Sales Order creation (VA01) with Stock Availability Check (ATP).
    1. Validates customer.
    2. Performs Availability Check on every material line item.
    3. Prevents selling more than available stock (Hard Reject).
    4. Reserves stock in inventory table.
    5. Calculates taxes, discounts, totals.
    6. Creates Sales Order in CONFIRMED status.
    """
    customer = db.query(Customer).filter(Customer.id == so_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    # Step 1 & 2: ATP Stock Availability Check for each line
    for item_in in so_in.items:
        material = db.query(Material).filter(Material.id == item_in.material_id).first()
        if not material:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {item_in.material_id} not found")

        is_available, available_qty = check_stock_availability(db, item_in.material_id, item_in.quantity)
        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock Availability Check failed for '{material.name}' ({material.material_code}). Requested: {item_in.quantity}, Available: {available_qty} {material.uom}."
            )

    so_num = generate_document_number(db, "SO", SalesOrder, SalesOrder.so_number)

    subtotal = 0.0
    discount_total = 0.0
    tax_total = 0.0

    so = SalesOrder(
        so_number=so_num,
        customer_id=so_in.customer_id,
        created_by_id=user.id,
        order_date=datetime.now(timezone.utc).date(),
        requested_delivery_date=so_in.requested_delivery_date,
        shipping_address=so_in.shipping_address,
        status=SOStatus.CONFIRMED,
        notes=so_in.notes
    )
    db.add(so)
    db.flush()

    for item_in in so_in.items:
        line_sub = item_in.quantity * item_in.unit_price
        disc_val = line_sub * (item_in.discount_percent / 100.0)
        after_disc = line_sub - disc_val
        line_tax = after_disc * (item_in.tax_rate / 100.0)
        line_total = after_disc + line_tax

        subtotal += line_sub
        discount_total += disc_val
        tax_total += line_tax

        so_item = SalesOrderItem(
            so_id=so.id,
            material_id=item_in.material_id,
            quantity=item_in.quantity,
            delivered_quantity=0.0,
            unit_price=item_in.unit_price,
            discount_percent=item_in.discount_percent,
            tax_rate=item_in.tax_rate,
            line_total=round(line_total, 2)
        )
        db.add(so_item)

        # Step 3: Stock Reservation
        # Reserve stock against available inventory records for this material
        needed = item_in.quantity
        inv_records = db.query(Inventory).filter(
            Inventory.material_id == item_in.material_id
        ).all()
        for inv in inv_records:
            avail = inv.quantity_available
            if avail > 0:
                alloc = min(avail, needed)
                inv.quantity_reserved += alloc
                needed -= alloc
                if needed <= 0:
                    break

    so.subtotal = round(subtotal, 2)
    so.discount_amount = round(discount_total, 2)
    so.tax_amount = round(tax_total, 2)
    so.total_amount = round((subtotal - discount_total) + tax_total, 2)

    db.commit()
    db.refresh(so)

    log_audit(
        db=db,
        action="CREATE_SALES_ORDER",
        module="Sales Order",
        record_id=so.so_number,
        description=f"{user.full_name} created Sales Order {so.so_number} for customer {customer.customer_name}. ATP check passed.",
        user=user,
        new_values={"so_number": so.so_number, "total_amount": so.total_amount, "customer": customer.customer_name}
    )

    return so

def create_delivery(db: Session, del_in: DeliveryCreate, user: User) -> Delivery:
    """
    Creates Outbound Delivery Document (SAP SD VL01N) against Confirmed Sales Order.
    """
    so = db.query(SalesOrder).filter(SalesOrder.id == del_in.so_id).first()
    if not so:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales Order not found")

    if so.status in [SOStatus.CANCELLED, SOStatus.DRAFT, SOStatus.DELIVERED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create delivery for Sales Order in '{so.status.value}' status."
        )

    warehouse = db.query(Warehouse).filter(Warehouse.id == del_in.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    del_num = generate_document_number(db, "DEL", Delivery, Delivery.delivery_number)

    delivery = Delivery(
        delivery_number=del_num,
        so_id=so.id,
        customer_id=so.customer_id,
        warehouse_id=warehouse.id,
        delivery_date=del_in.delivery_date or datetime.now(timezone.utc).date(),
        status=DeliveryStatus.PACKED,
        shipping_notes=del_in.shipping_notes,
        created_by_id=user.id
    )
    db.add(delivery)
    db.flush()

    for item_in in del_in.items:
        so_item = db.query(SalesOrderItem).filter(
            SalesOrderItem.id == item_in.so_item_id,
            SalesOrderItem.so_id == so.id
        ).first()

        if not so_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {item_in.so_item_id} does not belong to Sales Order {so.so_number}"
            )

        remaining_to_deliver = so_item.quantity - so_item.delivered_quantity
        if item_in.quantity > remaining_to_deliver:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Delivery quantity ({item_in.quantity}) exceeds remaining order quantity ({remaining_to_deliver})"
            )

        del_item = DeliveryItem(
            delivery_id=delivery.id,
            so_item_id=so_item.id,
            material_id=item_in.material_id,
            quantity=item_in.quantity,
            batch_number=item_in.batch_number or "BATCH-DEFAULT"
        )
        db.add(del_item)

    so.status = SOStatus.PROCESSING
    db.commit()
    db.refresh(delivery)

    log_audit(
        db=db,
        action="CREATE_DELIVERY",
        module="Delivery",
        record_id=delivery.delivery_number,
        description=f"{user.full_name} created Outbound Delivery {delivery.delivery_number} for SO {so.so_number}",
        user=user
    )

    return delivery

def post_goods_issue(db: Session, delivery_id: int, user: User) -> Delivery:
    """
    Simulates SAP SD Post Goods Issue (PGI).
    1. Decreases physical inventory.
    2. Creates immutable Stock Movement records.
    3. Updates Sales Order delivered quantities and statuses.
    4. Marks Delivery as DELIVERED.
    5. Automatically generates Customer Billing Document (Sales Invoice - SAP SD VF01).
    """
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")

    if delivery.status == DeliveryStatus.DELIVERED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Goods issue already posted for this delivery")

    if delivery.status == DeliveryStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot post goods issue for cancelled delivery")

    so = delivery.sales_order

    # For each delivery item, perform Goods Issue
    for del_item in delivery.items:
        so_item = del_item.so_item
        so_item.delivered_quantity += del_item.quantity

        # Deduct from inventory & create stock movement
        record_goods_issue_stock(
            db=db,
            material_id=del_item.material_id,
            warehouse_id=delivery.warehouse_id,
            quantity=del_item.quantity,
            batch_number=del_item.batch_number,
            reference_id=delivery.delivery_number,
            user=user,
            notes=f"Goods Issue for Delivery {delivery.delivery_number} against SO {so.so_number}"
        )

    # Check if all SO items are delivered
    all_delivered = all(item.delivered_quantity >= item.quantity for item in so.items)
    so.status = SOStatus.DELIVERED if all_delivered else SOStatus.PARTIALLY_DELIVERED

    delivery.status = DeliveryStatus.DELIVERED

    # Automatically generate Sales Invoice (Billing Document - VF01)
    inv_num = generate_document_number(db, "SINV", Invoice, Invoice.invoice_number)
    sales_inv = Invoice(
        invoice_number=inv_num,
        invoice_type=InvoiceType.SALES,
        customer_id=so.customer_id,
        reference_type="SalesOrder",
        reference_id=so.so_number,
        invoice_date=datetime.now(timezone.utc).date(),
        due_date=datetime.now(timezone.utc).date(),  # Will be adjusted by customer terms
        subtotal=so.subtotal,
        tax_amount=so.tax_amount,
        discount_amount=so.discount_amount,
        total_amount=so.total_amount,
        paid_amount=0.0,
        payment_status=PaymentStatus.PENDING,
        notes=f"Auto-generated on Goods Issue for Delivery {delivery.delivery_number} (SO {so.so_number})"
    )
    db.add(sales_inv)
    db.flush()

    for it in so.items:
        material = db.query(Material).filter(Material.id == it.material_id).first()
        inv_item = InvoiceItem(
            invoice_id=sales_inv.id,
            material_id=it.material_id,
            description=material.name if material else f"Material {it.material_id}",
            quantity=it.quantity,
            unit_price=it.unit_price,
            tax_rate=it.tax_rate,
            line_total=it.line_total
        )
        db.add(inv_item)

    db.commit()
    db.refresh(delivery)

    log_audit(
        db=db,
        action="POST_GOODS_ISSUE",
        module="Goods Issue",
        record_id=delivery.delivery_number,
        description=f"{user.full_name} posted Goods Issue (PGI) for Delivery {delivery.delivery_number}. Stock deducted. Generated Invoice {sales_inv.invoice_number}",
        user=user,
        new_values={"delivery_number": delivery.delivery_number, "so_status": so.status.value, "invoice_number": sales_inv.invoice_number}
    )

    return delivery
