from typing import Optional, Any
import json
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User

def log_audit(
    db: Session,
    action: str,
    module: str,
    description: str,
    record_id: Optional[str] = None,
    user: Optional[User] = None,
    old_values: Optional[Any] = None,
    new_values: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Create an immutable audit log entry."""
    old_val_str = json.dumps(old_values, default=str) if old_values is not None else None
    new_val_str = json.dumps(new_values, default=str) if new_values is not None else None

    username = user.username if user else "SYSTEM"
    user_id = user.id if user else None

    audit_entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        module=module,
        record_id=record_id,
        description=description,
        old_values=old_val_str,
        new_values=new_val_str,
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry
