from datetime import datetime, date, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.purchase import (
    PurchaseRequisition, PurchaseRequisitionItem, PRStatus, PRPriority,
    PurchaseOrder, PurchaseOrderItem, POStatus,
    GoodsReceipt, GoodsReceiptItem
)
from app.models.material import Material
from app.models.partner import Vendor
from app.models.warehouse import Warehouse
from app.models.user import User
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, PaymentStatus
from app.schemas.purchase import PRCreate, PRUpdate, POCreate, POUpdate, GRCreate
from app.services.inventory_service import record_goods_receipt_stock
from app.services.audit_service import log_audit

def generate_document_number(db: Session, prefix: str, model, column) -> str:
    count = db.query(model).count() + 1
    return f"{prefix}-{count:05d}"

def create_pr(db: Session, pr_in: PRCreate, user: User) -> PurchaseRequisition:
    pr_num = generate_document_number(db, "PR", PurchaseRequisition, PurchaseRequisition.pr_number)
    
    pr = PurchaseRequisition(
        pr_number=pr_num,
        requested_by_id=user.id,
        department=pr_in.department,
        status=PRStatus.DRAFT,
        priority=pr_in.priority,
        request_date=datetime.now(timezone.utc).date(),
        required_date=pr_in.required_date,
        reason=pr_in.reason
    )
    db.add(pr)
    db.flush()

    for item_in in pr_in.items:
        material = db.query(Material).filter(Material.id == item_in.material_id).first()
        if not material:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {item_in.material_id} not found")
        
        pr_item = PurchaseRequisitionItem(
            pr_id=pr.id,
            material_id=item_in.material_id,
            quantity=item_in.quantity,
            estimated_unit_price=item_in.estimated_unit_price or material.purchase_price,
            notes=item_in.notes
        )
        db.add(pr_item)

    db.commit()
    db.refresh(pr)

    log_audit(
        db=db,
        action="CREATE_PR",
        module="Purchase Requisition",
        record_id=pr.pr_number,
        description=f"{user.full_name} created Purchase Requisition {pr.pr_number}",
        user=user,
        new_values={"pr_number": pr.pr_number, "priority": pr.priority.value, "items_count": len(pr_in.items)}
    )
    return pr

def approve_pr(db: Session, pr_id: int, user: User) -> PurchaseRequisition:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Requisition not found")
    
    if pr.status != PRStatus.SUBMITTED and pr.status != PRStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot approve PR in status {pr.status.value}")

    pr.status = PRStatus.APPROVED
    db.commit()
    db.refresh(pr)

    log_audit(
        db=db,
        action="APPROVE_PR",
        module="Purchase Requisition",
        record_id=pr.pr_number,
        description=f"{user.full_name} approved Purchase Requisition {pr.pr_number}",
        user=user
    )
    return pr

def convert_pr_to_po(
    db: Session,
    pr_id: int,
    vendor_id: int,
    expected_delivery_date: date,
    shipping_address: str,
    user: User
) -> PurchaseOrder:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Requisition not found")
    
    if pr.status != PRStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved purchase requisitions can be converted to PO")

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    po_num = generate_document_number(db, "PO", PurchaseOrder, PurchaseOrder.po_number)
    
    subtotal = 0.0
    tax_total = 0.0

    po = PurchaseOrder(
        po_number=po_num,
        vendor_id=vendor_id,
        pr_id=pr.id,
        created_by_id=user.id,
        po_date=datetime.now(timezone.utc).date(),
        expected_delivery_date=expected_delivery_date,
        currency="USD",
        payment_terms=vendor.payment_terms or "Net 30",
        shipping_address=shipping_address,
        status=POStatus.PENDING_APPROVAL,
        notes=f"Converted from Requisition {pr.pr_number}"
    )
    db.add(po)
    db.flush()

    for item in pr.items:
        material = db.query(Material).filter(Material.id == item.material_id).first()
        price = item.estimated_unit_price or (material.purchase_price if material else 0.0)
        tax_rate = material.tax_rate if material else 18.0
        line_sub = item.quantity * price
        line_tax = line_sub * (tax_rate / 100.0)
        line_total = line_sub + line_tax

        subtotal += line_sub
        tax_total += line_tax

        po_item = PurchaseOrderItem(
            po_id=po.id,
            material_id=item.material_id,
            quantity=item.quantity,
            received_quantity=0.0,
            unit_price=price,
            tax_rate=tax_rate,
            discount_percent=0.0,
            line_total=line_total
        )
        db.add(po_item)

    po.subtotal = round(subtotal, 2)
    po.tax_amount = round(tax_total, 2)
    po.discount_amount = 0.0
    po.total_amount = round(subtotal + tax_total, 2)

    pr.status = PRStatus.CONVERTED_TO_PO
    db.commit()
    db.refresh(po)

    log_audit(
        db=db,
        action="CONVERT_PR_TO_PO",
        module="Procurement",
        record_id=po.po_number,
        description=f"Converted PR {pr.pr_number} to Purchase Order {po.po_number}",
        user=user,
        new_values={"po_number": po.po_number, "pr_number": pr.pr_number, "total_amount": po.total_amount}
    )
    return po

def create_po(db: Session, po_in: POCreate, user: User) -> PurchaseOrder:
    vendor = db.query(Vendor).filter(Vendor.id == po_in.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    po_num = generate_document_number(db, "PO", PurchaseOrder, PurchaseOrder.po_number)
    
    subtotal = 0.0
    tax_total = 0.0
    discount_total = 0.0

    po = PurchaseOrder(
        po_number=po_num,
        vendor_id=po_in.vendor_id,
        pr_id=po_in.pr_id,
        created_by_id=user.id,
        po_date=datetime.now(timezone.utc).date(),
        expected_delivery_date=po_in.expected_delivery_date,
        currency=po_in.currency,
        payment_terms=po_in.payment_terms or vendor.payment_terms,
        shipping_address=po_in.shipping_address,
        status=POStatus.PENDING_APPROVAL,
        notes=po_in.notes
    )
    db.add(po)
    db.flush()

    for item_in in po_in.items:
        material = db.query(Material).filter(Material.id == item_in.material_id).first()
        if not material:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {item_in.material_id} not found")

        line_sub = item_in.quantity * item_in.unit_price
        disc_val = line_sub * (item_in.discount_percent / 100.0)
        after_disc = line_sub - disc_val
        line_tax = after_disc * (item_in.tax_rate / 100.0)
        line_total = after_disc + line_tax

        subtotal += line_sub
        discount_total += disc_val
        tax_total += line_tax

        po_item = PurchaseOrderItem(
            po_id=po.id,
            material_id=item_in.material_id,
            quantity=item_in.quantity,
            received_quantity=0.0,
            unit_price=item_in.unit_price,
            tax_rate=item_in.tax_rate,
            discount_percent=item_in.discount_percent,
            line_total=round(line_total, 2)
        )
        db.add(po_item)

    po.subtotal = round(subtotal, 2)
    po.discount_amount = round(discount_total, 2)
    po.tax_amount = round(tax_total, 2)
    po.total_amount = round((subtotal - discount_total) + tax_total, 2)

    db.commit()
    db.refresh(po)

    log_audit(
        db=db,
        action="CREATE_PO",
        module="Purchase Order",
        record_id=po.po_number,
        description=f"{user.full_name} created PO {po.po_number} for vendor {vendor.company_name}",
        user=user,
        new_values={"po_number": po.po_number, "total_amount": po.total_amount}
    )
    return po

def approve_po(db: Session, po_id: int, user: User) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found")
    
    if po.status != POStatus.PENDING_APPROVAL and po.status != POStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot approve PO in status {po.status.value}")

    po.status = POStatus.APPROVED
    db.commit()
    db.refresh(po)

    log_audit(
        db=db,
        action="APPROVE_PO",
        module="Purchase Order",
        record_id=po.po_number,
        description=f"{user.full_name} approved Purchase Order {po.po_number}",
        user=user
    )
    return po

def process_goods_receipt(db: Session, gr_in: GRCreate, user: User) -> GoodsReceipt:
    """
    Simulates SAP MM Goods Receipt (MIGO).
    1. Validates PO state.
    2. Updates PO line received quantities.
    3. Increases warehouse inventory & creates immutable Stock Movements.
    4. Updates PO status to Partially Received or Fully Received.
    5. Automatically generates a Purchase Invoice (SAP MM MIRO).
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == gr_in.po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found")

    if po.status in [POStatus.CANCELLED, POStatus.DRAFT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot receive goods for PO in '{po.status.value}' status. PO must be Approved or Sent to Vendor."
        )

    if po.status == POStatus.FULLY_RECEIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase Order has already been fully received"
        )

    warehouse = db.query(Warehouse).filter(Warehouse.id == gr_in.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    gr_num = generate_document_number(db, "GR", GoodsReceipt, GoodsReceipt.gr_number)

    gr = GoodsReceipt(
        gr_number=gr_num,
        po_id=po.id,
        vendor_id=po.vendor_id,
        warehouse_id=warehouse.id,
        receipt_date=gr_in.receipt_date or datetime.now(timezone.utc).date(),
        received_by_id=user.id,
        notes=gr_in.notes
    )
    db.add(gr)
    db.flush()

    received_any = False
    for item_in in gr_in.items:
        if item_in.received_quantity <= 0:
            continue

        po_item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.id == item_in.po_item_id,
            PurchaseOrderItem.po_id == po.id
        ).first()

        if not po_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Purchase order item {item_in.po_item_id} does not belong to this PO"
            )

        remaining_to_receive = po_item.quantity - po_item.received_quantity
        if item_in.received_quantity > remaining_to_receive:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Received quantity ({item_in.received_quantity}) exceeds pending quantity ({remaining_to_receive}) for material {po_item.material_id}"
            )

        po_item.received_quantity += item_in.received_quantity
        received_any = True

        gr_item = GoodsReceiptItem(
            gr_id=gr.id,
            po_item_id=po_item.id,
            material_id=item_in.material_id,
            received_quantity=item_in.received_quantity,
            rejected_quantity=item_in.rejected_quantity,
            batch_number=item_in.batch_number or "BATCH-001",
            notes=item_in.notes
        )
        db.add(gr_item)

        # Automatically increase inventory & record Stock Movement
        record_goods_receipt_stock(
            db=db,
            material_id=item_in.material_id,
            warehouse_id=warehouse.id,
            quantity=item_in.received_quantity,
            batch_number=item_in.batch_number or "BATCH-001",
            reference_id=gr_num,
            user=user,
            notes=f"Goods Receipt {gr_num} for PO {po.po_number}"
        )

    if not received_any:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one item must have a received quantity greater than zero"
        )

    # Check overall PO completion status
    all_po_items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).all()
    all_fully_received = all(it.received_quantity >= it.quantity for it in all_po_items)

    po.status = POStatus.FULLY_RECEIVED if all_fully_received else POStatus.PARTIALLY_RECEIVED

    # Generate Purchase Invoice (SAP MM MIRO)
    inv_num = generate_document_number(db, "PINV", Invoice, Invoice.invoice_number)
    purchase_inv = Invoice(
        invoice_number=inv_num,
        invoice_type=InvoiceType.PURCHASE,
        vendor_id=po.vendor_id,
        reference_type="PurchaseOrder",
        reference_id=po.po_number,
        invoice_date=datetime.now(timezone.utc).date(),
        due_date=po.expected_delivery_date,
        subtotal=po.subtotal,
        tax_amount=po.tax_amount,
        discount_amount=po.discount_amount,
        total_amount=po.total_amount,
        paid_amount=0.0,
        payment_status=PaymentStatus.PENDING,
        notes=f"Auto-generated on Goods Receipt {gr_num} for PO {po.po_number}"
    )
    db.add(purchase_inv)
    db.flush()

    for it in all_po_items:
        material = db.query(Material).filter(Material.id == it.material_id).first()
        inv_item = InvoiceItem(
            invoice_id=purchase_inv.id,
            material_id=it.material_id,
            description=material.name if material else f"Material {it.material_id}",
            quantity=it.quantity,
            unit_price=it.unit_price,
            tax_rate=it.tax_rate,
            line_total=it.line_total
        )
        db.add(inv_item)

    db.commit()
    db.refresh(gr)

    log_audit(
        db=db,
        action="GOODS_RECEIPT",
        module="Goods Receipt",
        record_id=gr.gr_number,
        description=f"{user.full_name} processed Goods Receipt {gr.gr_number} against PO {po.po_number}. PO status: {po.status.value}",
        user=user,
        new_values={"gr_number": gr.gr_number, "po_number": po.po_number, "po_status": po.status.value}
    )

    return gr
