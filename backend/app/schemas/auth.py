from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    email: str
    full_name: str
    role: UserRole

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
