from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.invoice import Invoice, InvoiceItem, Payment, InvoiceType, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.invoice import InvoiceResponse, PaymentCreate, PaymentResponse
from app.services.billing_service import record_payment

router = APIRouter()

def serialize_invoice(inv: Invoice) -> dict:
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "invoice_type": inv.invoice_type,
        "customer_id": inv.customer_id,
        "customer_name": inv.customer.customer_name if inv.customer else None,
        "vendor_id": inv.vendor_id,
        "vendor_name": inv.vendor.company_name if inv.vendor else None,
        "reference_type": inv.reference_type,
        "reference_id": inv.reference_id,
        "invoice_date": inv.invoice_date,
        "due_date": inv.due_date,
        "subtotal": inv.subtotal,
        "tax_amount": inv.tax_amount,
        "discount_amount": inv.discount_amount,
        "total_amount": inv.total_amount,
        "paid_amount": inv.paid_amount,
        "balance_due": inv.balance_due,
        "payment_status": inv.payment_status,
        "notes": inv.notes,
        "items": [
            {
                "id": it.id,
                "material_id": it.material_id,
                "description": it.description,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "tax_rate": it.tax_rate,
                "line_total": it.line_total
            }
            for it in inv.items
        ],
        "payments": [
            {
                "id": p.id,
                "payment_number": p.payment_number,
                "invoice_id": p.invoice_id,
                "payment_date": p.payment_date,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "reference_number": p.reference_number,
                "notes": p.notes,
                "created_at": p.created_at
            }
            for p in inv.payments
        ],
        "created_at": inv.created_at,
        "updated_at": inv.updated_at
    }

@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    skip: int = 0,
    limit: int = 50,
    invoice_type: Optional[str] = None,
    payment_status: Optional[str] = None,
    customer_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    query = db.query(Invoice)

    if invoice_type:
        query = query.filter(Invoice.invoice_type == invoice_type)
    if payment_status:
        query = query.filter(Invoice.payment_status == payment_status)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if vendor_id:
        query = query.filter(Invoice.vendor_id == vendor_id)

    invoices = query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()
    return [serialize_invoice(inv) for inv in invoices]

@router.get("/{id}", response_model=InvoiceResponse)
def get_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    inv = db.query(Invoice).filter(Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_invoice(inv)

@router.post("/payments", response_model=PaymentResponse)
def record_invoice_payment(
    pay_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    """Record payment receipt or disbursement against invoice."""
    payment = record_payment(db=db, pay_in=pay_in, user=current_user)
    return payment
