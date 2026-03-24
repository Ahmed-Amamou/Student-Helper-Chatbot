from datetime import datetime

from pydantic import BaseModel


class ChatCreate(BaseModel):
    title: str = "New Chat"


class ChatUpdate(BaseModel):
    title: str


class ChatResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatDetailResponse(ChatResponse):
    messages: list["MessageResponse"] = []


from app.schemas.message import MessageResponse  # noqa: E402

ChatDetailResponse.model_rebuild()
