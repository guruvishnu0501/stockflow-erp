from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, APPROVE, RECEIVE, ISSUE, ADJUST, DELETE
    module = Column(String(50), nullable=False, index=True)  # Material, Vendor, Customer, PO, PR, SO, Delivery, Inventory, Invoice
    record_id = Column(String(100), nullable=True)
    description = Column(String(500), nullable=False)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User", foreign_keys=[user_id])
