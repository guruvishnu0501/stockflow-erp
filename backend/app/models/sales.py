from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class SOStatus(str, enum.Enum):
    DRAFT = "Draft"
    CONFIRMED = "Confirmed"
    PROCESSING = "Processing"
    PARTIALLY_DELIVERED = "Partially Delivered"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"

class DeliveryStatus(str, enum.Enum):
    PENDING = "Pending"
    PICKING = "Picking"
    PACKED = "Packed"
    SHIPPED = "Shipped"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    so_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    requested_delivery_date = Column(Date, nullable=False)
    shipping_address = Column(Text, nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    status = Column(SQLEnum(SOStatus), default=SOStatus.DRAFT, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    customer = relationship("Customer")
    created_by = relationship("User", foreign_keys=[created_by_id])
    items = relationship("SalesOrderItem", back_populates="so", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="sales_order")

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    so_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    delivered_quantity = Column(Float, default=0.0, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=18.0, nullable=False)
    line_total = Column(Float, nullable=False)

    so = relationship("SalesOrder", back_populates="items")
    material = relationship("Material")

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    delivery_number = Column(String(50), unique=True, index=True, nullable=False)
    so_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    delivery_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    status = Column(SQLEnum(DeliveryStatus), default=DeliveryStatus.PENDING, nullable=False)
    shipping_notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    sales_order = relationship("SalesOrder", back_populates="deliveries")
    customer = relationship("Customer")
    warehouse = relationship("Warehouse")
    created_by = relationship("User", foreign_keys=[created_by_id])
    items = relationship("DeliveryItem", back_populates="delivery", cascade="all, delete-orphan")

class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    so_item_id = Column(Integer, ForeignKey("sales_order_items.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    batch_number = Column(String(100), default="BATCH-DEFAULT", nullable=True)

    delivery = relationship("Delivery", back_populates="items")
    so_item = relationship("SalesOrderItem")
    material = relationship("Material")
