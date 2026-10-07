from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.warehouse import WarehouseStatus

class WarehouseBase(BaseModel):
    code: str
    name: str
    location: str
    manager_name: Optional[str] = None
    capacity: int = 10000
    status: WarehouseStatus = WarehouseStatus.ACTIVE

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    manager_name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[WarehouseStatus] = None

class WarehouseResponse(WarehouseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
