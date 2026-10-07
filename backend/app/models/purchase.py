from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class PRStatus(str, enum.Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    CONVERTED_TO_PO = "Converted to PO"

class PRPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"

class POStatus(str, enum.Enum):
    DRAFT = "Draft"
    PENDING_APPROVAL = "Pending Approval"
    APPROVED = "Approved"
    SENT_TO_VENDOR = "Sent to Vendor"
    PARTIALLY_RECEIVED = "Partially Received"
    FULLY_RECEIVED = "Fully Received"
    CANCELLED = "Cancelled"

class PurchaseRequisition(Base):
    __tablename__ = "purchase_requisitions"

    id = Column(Integer, primary_key=True, index=True)
    pr_number = Column(String(50), unique=True, index=True, nullable=False)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String(100), default="Procurement", nullable=False)
    status = Column(SQLEnum(PRStatus), default=PRStatus.DRAFT, nullable=False)
    priority = Column(SQLEnum(PRPriority), default=PRPriority.MEDIUM, nullable=False)
    request_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    required_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    requested_by = relationship("User", foreign_keys=[requested_by_id])
    items = relationship("PurchaseRequisitionItem", back_populates="pr", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="purchase_requisition")

class PurchaseRequisitionItem(Base):
    __tablename__ = "purchase_requisition_items"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requisitions.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    estimated_unit_price = Column(Float, default=0.0, nullable=False)
    notes = Column(String(255), nullable=True)

    pr = relationship("PurchaseRequisition", back_populates="items")
    material = relationship("Material")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    pr_id = Column(Integer, ForeignKey("purchase_requisitions.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    po_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    expected_delivery_date = Column(Date, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    payment_terms = Column(String(100), default="Net 30", nullable=False)
    shipping_address = Column(Text, nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    status = Column(SQLEnum(POStatus), default=POStatus.DRAFT, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    vendor = relationship("Vendor")
    purchase_requisition = relationship("PurchaseRequisition", back_populates="purchase_orders")
    created_by = relationship("User", foreign_keys=[created_by_id])
    items = relationship("PurchaseOrderItem", back_populates="po", cascade="all, delete-orphan")
    goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    received_quantity = Column(Float, default=0.0, nullable=False)
    unit_price = Column(Float, nullable=False)
    tax_rate = Column(Float, default=18.0, nullable=False)
    discount_percent = Column(Float, default=0.0, nullable=False)
    line_total = Column(Float, nullable=False)

    po = relationship("PurchaseOrder", back_populates="items")
    material = relationship("Material")

class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, index=True)
    gr_number = Column(String(50), unique=True, index=True, nullable=False)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    receipt_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")
    vendor = relationship("Vendor")
    warehouse = relationship("Warehouse")
    received_by = relationship("User", foreign_keys=[received_by_id])
    items = relationship("GoodsReceiptItem", back_populates="goods_receipt", cascade="all, delete-orphan")

class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    gr_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False)
    po_item_id = Column(Integer, ForeignKey("purchase_order_items.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    received_quantity = Column(Float, nullable=False)
    rejected_quantity = Column(Float, default=0.0, nullable=False)
    batch_number = Column(String(100), default="BATCH-001", nullable=True)
    notes = Column(String(255), nullable=True)

    goods_receipt = relationship("GoodsReceipt", back_populates="items")
    po_item = relationship("PurchaseOrderItem")
    material = relationship("Material")
