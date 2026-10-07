from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.invoice import Invoice, InvoiceItem, Payment, PaymentStatus
from app.models.user import User
from app.schemas.invoice import PaymentCreate
from app.services.procurement_service import generate_document_number
from app.services.audit_service import log_audit

def record_payment(db: Session, pay_in: PaymentCreate, user: User) -> Payment:
    invoice = db.query(Invoice).filter(Invoice.id == pay_in.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if invoice.payment_status == PaymentStatus.PAID:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice has already been fully paid")

    if pay_in.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero")

    balance = invoice.total_amount - invoice.paid_amount
    if pay_in.amount > balance + 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (${pay_in.amount}) exceeds outstanding balance (${round(balance, 2)})"
        )

    pay_num = generate_document_number(db, "PAY", Payment, Payment.payment_number)

    payment = Payment(
        payment_number=pay_num,
        invoice_id=invoice.id,
        payment_date=pay_in.payment_date or datetime.now(timezone.utc).date(),
        amount=pay_in.amount,
        payment_method=pay_in.payment_method,
        reference_number=pay_in.reference_number,
        notes=pay_in.notes
    )
    db.add(payment)

    invoice.paid_amount = round(invoice.paid_amount + pay_in.amount, 2)
    if invoice.paid_amount >= invoice.total_amount - 0.01:
        invoice.payment_status = PaymentStatus.PAID
    else:
        invoice.payment_status = PaymentStatus.PARTIALLY_PAID

    db.commit()
    db.refresh(payment)

    log_audit(
        db=db,
        action="RECORD_PAYMENT",
        module="Invoice",
        record_id=payment.payment_number,
        description=f"{user.full_name} recorded payment of ${payment.amount} for Invoice {invoice.invoice_number}. New status: {invoice.payment_status.value}",
        user=user,
        new_values={"payment_number": payment.payment_number, "amount": payment.amount, "invoice_status": invoice.payment_status.value}
    )

    return payment
