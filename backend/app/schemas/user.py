from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    auth_provider: str
    avatar_url: str | None
    class_name: str | None
    semester: str | None
    year: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRoleUpdate(BaseModel):
    role: str  # "student" or "admin"


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    class_name: str | None = None
    semester: str | None = None
    year: str | None = None
