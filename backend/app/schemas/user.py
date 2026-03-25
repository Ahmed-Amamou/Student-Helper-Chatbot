from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    auth_provider: str
    avatar_url: str | None
    discipline: str | None
    year_of_study: int | None
    semester: str | None
    class_group: str | None
    is_verified: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRoleUpdate(BaseModel):
    role: str  # "student" or "admin"


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    discipline: str | None = None
    year_of_study: int | None = None
    semester: str | None = None
    class_group: str | None = None
