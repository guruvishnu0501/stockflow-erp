from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.partner import Customer, PartnerStatus
from app.models.sales import SalesOrder, SOStatus
from app.models.invoice import Invoice, InvoiceType, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.partner import CustomerCreate, CustomerUpdate, CustomerResponse
from app.services.audit_service import log_audit

router = APIRouter()

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve list of customers with search and filters."""
    query = db.query(Customer)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Customer.code.ilike(search_filter),
                Customer.customer_name.ilike(search_filter),
                Customer.company_name.ilike(search_filter),
                Customer.email.ilike(search_filter)
            )
        )

    if status:
        query = query.filter(Customer.status == status)

    return query.order_by(Customer.customer_name.asc()).offset(skip).limit(limit).all()

@router.get("/{id}", response_model=CustomerResponse)
def get_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.get("/{id}/summary")
def get_customer_summary(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get customer sales history, outstanding balance, and credit stats."""
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    sos = db.query(SalesOrder).filter(SalesOrder.customer_id == id).all()
    total_sales_val = sum(so.total_amount for so in sos if so.status != SOStatus.CANCELLED)

    invoices = db.query(Invoice).filter(
        Invoice.customer_id == id,
        Invoice.invoice_type == InvoiceType.SALES
    ).all()

    outstanding_balance = sum(inv.balance_due for inv in invoices)

    return {
        "customer": customer,
        "total_sales_value": round(total_sales_val, 2),
        "total_orders_count": len(sos),
        "outstanding_balance": round(outstanding_balance, 2),
        "credit_limit": customer.credit_limit,
        "available_credit": max(0.0, customer.credit_limit - outstanding_balance),
        "recent_sales_orders": [
            {
                "id": so.id,
                "so_number": so.so_number,
                "order_date": str(so.order_date),
                "total_amount": so.total_amount,
                "status": so.status.value
            }
            for so in sorted(sos, key=lambda x: x.created_at, reverse=True)[:5]
        ],
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": str(inv.invoice_date),
                "due_date": str(inv.due_date),
                "total_amount": inv.total_amount,
                "balance_due": inv.balance_due,
                "payment_status": inv.payment_status.value
            }
            for inv in sorted(invoices, key=lambda x: x.created_at, reverse=True)[:5]
        ]
    }

@router.post("", response_model=CustomerResponse)
def create_customer(
    c_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER]))
) -> Any:
    existing = db.query(Customer).filter(Customer.code == c_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer code already exists")

    customer = Customer(**c_in.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)

    log_audit(
        db=db,
        action="CREATE_CUSTOMER",
        module="Customer Master",
        record_id=customer.code,
        description=f"{current_user.full_name} created customer {customer.code} - {customer.customer_name}",
        user=current_user,
        new_values=c_in.model_dump()
    )

    return customer

@router.put("/{id}", response_model=CustomerResponse)
def update_customer(
    id: int,
    c_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_MANAGER]))
) -> Any:
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = c_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(customer, field, val)

    db.commit()
    db.refresh(customer)

    log_audit(
        db=db,
        action="UPDATE_CUSTOMER",
        module="Customer Master",
        record_id=customer.code,
        description=f"{current_user.full_name} updated customer {customer.code}",
        user=current_user,
        new_values=update_data
    )

    return customer

@router.delete("/{id}")
def deactivate_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.status = PartnerStatus.INACTIVE
    db.commit()

    log_audit(
        db=db,
        action="DEACTIVATE_CUSTOMER",
        module="Customer Master",
        record_id=customer.code,
        description=f"{current_user.full_name} deactivated customer {customer.code}",
        user=current_user
    )
    return {"message": "Customer deactivated successfully"}
