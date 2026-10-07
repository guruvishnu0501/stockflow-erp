from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user, require_role
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.services.audit_service import log_audit

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    return db.query(User).all()

@router.post("", response_model=UserResponse)
def create_user(
    u_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    existing = db.query(User).filter(
        (User.username == u_in.username) | (User.email == u_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        email=u_in.email,
        username=u_in.username,
        full_name=u_in.full_name,
        hashed_password=get_password_hash(u_in.password),
        role=u_in.role,
        department=u_in.department,
        is_active=u_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(
        db=db,
        action="CREATE_USER",
        module="User Management",
        record_id=user.username,
        description=f"{current_user.full_name} created user {user.username} with role {user.role.value}",
        user=current_user
    )

    return user

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    u_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
) -> Any:
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if u_in.email:
        user.email = u_in.email
    if u_in.full_name:
        user.full_name = u_in.full_name
    if u_in.role:
        user.role = u_in.role
    if u_in.department is not None:
        user.department = u_in.department
    if u_in.is_active is not None:
        user.is_active = u_in.is_active
    if u_in.password:
        user.hashed_password = get_password_hash(u_in.password)

    db.commit()
    db.refresh(user)

    log_audit(
        db=db,
        action="UPDATE_USER",
        module="User Management",
        record_id=user.username,
        description=f"{current_user.full_name} updated user {user.username}",
        user=current_user
    )

    return user
