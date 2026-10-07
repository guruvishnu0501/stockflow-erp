from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
import enum
from app.db.session import Base

class WarehouseStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    manager_name = Column(String(255), nullable=True)
    capacity = Column(Integer, default=10000, nullable=False)
    status = Column(SQLEnum(WarehouseStatus), default=WarehouseStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
