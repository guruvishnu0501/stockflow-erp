from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class StockStatus(str, enum.Enum):
    IN_STOCK = "In Stock"
    LOW_STOCK = "Low Stock"
    OUT_OF_STOCK = "Out of Stock"
    OVERSTOCK = "Overstock"

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    materials = relationship("Material", back_populates="category")

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    material_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory = Column(String(100), nullable=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    uom = Column(String(20), default="PC", nullable=False)  # PC, KG, LTR, MTR, BOX, etc.
    purchase_price = Column(Float, default=0.0, nullable=False)
    selling_price = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=18.0, nullable=False)  # GST rate %
    min_stock_level = Column(Float, default=10.0, nullable=False)
    max_stock_level = Column(Float, default=1000.0, nullable=False)
    reorder_level = Column(Float, default=25.0, nullable=False)
    default_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    primary_vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    category = relationship("Category", back_populates="materials")
    warehouse = relationship("Warehouse", foreign_keys=[default_warehouse_id])
    vendor = relationship("Vendor", foreign_keys=[primary_vendor_id])
    inventory_records = relationship("Inventory", back_populates="material", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="material")

    @property
    def total_stock(self) -> float:
        if self.inventory_records:
            return sum(inv.quantity_on_hand for inv in self.inventory_records)
        return 0.0

    @property
    def stock_status(self) -> StockStatus:
        stock = self.total_stock
        if stock <= 0:
            return StockStatus.OUT_OF_STOCK
        elif stock <= self.reorder_level:
            return StockStatus.LOW_STOCK
        elif stock >= self.max_stock_level:
            return StockStatus.OVERSTOCK
        return StockStatus.IN_STOCK
