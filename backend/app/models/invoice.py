from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class InvoiceType(str, enum.Enum):
    SALES = "Sales"
    PURCHASE = "Purchase"

class PaymentStatus(str, enum.Enum):
    PENDING = "Pending"
    PARTIALLY_PAID = "Partially Paid"
    PAID = "Paid"
    OVERDUE = "Overdue"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    invoice_type = Column(SQLEnum(InvoiceType), nullable=False)
    
    # Optional links depending on whether it's Sales or Purchase invoice
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    reference_type = Column(String(50), nullable=True)  # "SalesOrder", "PurchaseOrder", "Delivery"
    reference_id = Column(String(50), nullable=True)   # "SO-1001", "PO-2001"
    
    invoice_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    due_date = Column(Date, nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    customer = relationship("Customer")
    vendor = relationship("Vendor")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

    @property
    def balance_due(self) -> float:
        return max(0.0, self.total_amount - self.paid_amount)

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit_price = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=18.0, nullable=False)
    line_total = Column(Float, default=0.0, nullable=False)

    invoice = relationship("Invoice", back_populates="items")
    material = relationship("Material")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, index=True, nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    payment_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="Bank Transfer", nullable=False)  # Bank Transfer, Cheque, Cash, Credit Card
    reference_number = Column(String(100), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    invoice = relationship("Invoice", back_populates="payments")
