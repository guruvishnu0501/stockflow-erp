from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class MovementType(str, enum.Enum):
    GOODS_RECEIPT = "Goods Receipt"
    GOODS_ISSUE = "Goods Issue"
    SALES = "Sales"
    PURCHASE = "Purchase"
    RETURN = "Return"
    ADJUSTMENT = "Adjustment"
    TRANSFER = "Transfer"

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), index=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True, nullable=False)
    quantity_on_hand = Column(Float, default=0.0, nullable=False)
    quantity_reserved = Column(Float, default=0.0, nullable=False)
    batch_number = Column(String(100), default="BATCH-DEFAULT", nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    material = relationship("Material", back_populates="inventory_records")
    warehouse = relationship("Warehouse")

    @property
    def quantity_available(self) -> float:
        return max(0.0, self.quantity_on_hand - self.quantity_reserved)

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    movement_type = Column(SQLEnum(MovementType), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), index=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True, nullable=False)
    dest_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity = Column(Float, nullable=False)  # Magnitude of stock moved
    balance_after = Column(Float, default=0.0, nullable=False)  # Stock level after movement
    batch_number = Column(String(100), nullable=True)
    reference_type = Column(String(100), nullable=True)  # PO, SO, Delivery, Manual Adjustment, PR, etc.
    reference_id = Column(String(100), nullable=True)  # Document number (e.g. PO-1001, SO-2001, GR-3001)
    reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    material = relationship("Material", back_populates="stock_movements")
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id])
    dest_warehouse = relationship("Warehouse", foreign_keys=[dest_warehouse_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
