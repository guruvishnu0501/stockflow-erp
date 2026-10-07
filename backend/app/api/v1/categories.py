from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user, require_role
from app.models.material import Category
from app.models.user import User, UserRole
from app.schemas.material import CategoryCreate, CategoryResponse

router = APIRouter()

@router.get("", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return db.query(Category).order_by(Category.name.asc()).all()

@router.post("", response_model=CategoryResponse)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
) -> Any:
    existing = db.query(Category).filter(Category.code == cat_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category code already exists")
    
    category = Category(
        code=cat_in.code,
        name=cat_in.name,
        description=cat_in.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
