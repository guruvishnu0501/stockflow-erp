import csv
import io
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.material import Material, Category, StockStatus
from app.models.inventory import Inventory
from app.models.warehouse import Warehouse
from app.models.partner import Vendor
from app.models.user import User, UserRole
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.services.inventory_service import record_goods_receipt_stock
from app.services.audit_service import log_audit

router = APIRouter()

def serialize_material(m: Material) -> dict:
    total_stk = m.total_stock
    stk_stat = m.stock_status
    return {
        "id": m.id,
        "material_code": m.material_code,
        "name": m.name,
        "description": m.description,
        "category_id": m.category_id,
        "category_name": m.category.name if m.category else None,
        "subcategory": m.subcategory,
        "sku": m.sku,
        "uom": m.uom,
        "purchase_price": m.purchase_price,
        "selling_price": m.selling_price,
        "tax_rate": m.tax_rate,
        "min_stock_level": m.min_stock_level,
        "max_stock_level": m.max_stock_level,
        "reorder_level": m.reorder_level,
        "default_warehouse_id": m.default_warehouse_id,
        "warehouse_name": m.warehouse.name if m.warehouse else None,
        "primary_vendor_id": m.primary_vendor_id,
        "vendor_name": m.vendor.company_name if m.vendor else None,
        "is_active": m.is_active,
        "total_stock": total_stk,
        "stock_status": stk_stat,
        "created_at": m.created_at,
        "updated_at": m.updated_at
    }

@router.get("", response_model=List[MaterialResponse])
def get_materials(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    stock_status: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    sort_by: str = "material_code",
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve material master list with search, filtering, and pagination."""
    query = db.query(Material).filter(Material.is_active == True)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Material.material_code.ilike(search_filter),
                Material.name.ilike(search_filter),
                Material.sku.ilike(search_filter),
                Material.description.ilike(search_filter)
            )
        )

    if category_id:
        query = query.filter(Material.category_id == category_id)

    if warehouse_id:
        query = query.filter(Material.default_warehouse_id == warehouse_id)

    order_col = getattr(Material, sort_by, Material.material_code)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    materials = query.all()

    # In-memory filter for computed stock_status if specified
    serialized = [serialize_material(m) for m in materials]
    if stock_status:
        serialized = [m for m in serialized if m["stock_status"].value == stock_status]

    return serialized[skip : skip + limit]

@router.get("/{id}", response_model=MaterialResponse)
def get_material(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get single material master details."""
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return serialize_material(material)

@router.post("", response_model=MaterialResponse)
def create_material(
    mat_in: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    """Create a new Material Master record."""
    existing = db.query(Material).filter(
        (Material.material_code == mat_in.material_code) | (Material.sku == mat_in.sku)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material code or SKU already exists")

    material = Material(
        material_code=mat_in.material_code,
        name=mat_in.name,
        description=mat_in.description,
        category_id=mat_in.category_id,
        subcategory=mat_in.subcategory,
        sku=mat_in.sku,
        uom=mat_in.uom,
        purchase_price=mat_in.purchase_price,
        selling_price=mat_in.selling_price,
        tax_rate=mat_in.tax_rate,
        min_stock_level=mat_in.min_stock_level,
        max_stock_level=mat_in.max_stock_level,
        reorder_level=mat_in.reorder_level,
        default_warehouse_id=mat_in.default_warehouse_id,
        primary_vendor_id=mat_in.primary_vendor_id,
        is_active=mat_in.is_active
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # Initial stock allocation if provided
    if mat_in.initial_stock and mat_in.initial_stock > 0 and mat_in.default_warehouse_id:
        record_goods_receipt_stock(
            db=db,
            material_id=material.id,
            warehouse_id=mat_in.default_warehouse_id,
            quantity=mat_in.initial_stock,
            batch_number="INIT-BATCH",
            reference_id=f"INIT-{material.material_code}",
            user=current_user,
            notes="Initial stock upload on material creation"
        )
        db.commit()
        db.refresh(material)

    log_audit(
        db=db,
        action="CREATE_MATERIAL",
        module="Material Master",
        record_id=material.material_code,
        description=f"{current_user.full_name} created material {material.material_code} - {material.name}",
        user=current_user,
        new_values={"material_code": material.material_code, "name": material.name, "purchase_price": material.purchase_price}
    )

    return serialize_material(material)

@router.put("/{id}", response_model=MaterialResponse)
def update_material(
    id: int,
    mat_in: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PROCUREMENT_MANAGER]))
) -> Any:
    """Update material master data."""
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    update_data = mat_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(material, field, val)

    db.commit()
    db.refresh(material)

    log_audit(
        db=db,
        action="UPDATE_MATERIAL",
        module="Material Master",
        record_id=material.material_code,
        description=f"{current_user.full_name} updated material {material.material_code}",
        user=current_user,
        new_values=update_data
    )

    return serialize_material(material)

@router.delete("/{id}")
def delete_material(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    """Soft delete / deactivate a material."""
    material = db.query(Material).filter(Material.id == id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    material.is_active = False
    db.commit()

    log_audit(
        db=db,
        action="DEACTIVATE_MATERIAL",
        module="Material Master",
        record_id=material.material_code,
        description=f"{current_user.full_name} deactivated material {material.material_code}",
        user=current_user
    )
    return {"message": "Material deactivated successfully"}

@router.get("/export/csv")
def export_materials_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Export material master list to CSV file."""
    materials = db.query(Material).filter(Material.is_active == True).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Material Code", "Name", "SKU", "Category", "UoM", 
        "Purchase Price", "Selling Price", "Tax Rate (%)", 
        "Current Stock", "Min Stock", "Reorder Level", "Stock Status"
    ])

    for m in materials:
        writer.writerow([
            m.material_code,
            m.name,
            m.sku,
            m.category.name if m.category else "",
            m.uom,
            m.purchase_price,
            m.selling_price,
            m.tax_rate,
            m.total_stock,
            m.min_stock_level,
            m.reorder_level,
            m.stock_status.value
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=material_master.csv"}
    )
