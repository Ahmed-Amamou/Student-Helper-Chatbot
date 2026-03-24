import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator


class MessageCreate(BaseModel):
    content: str


class SourceInfo(BaseModel):
    doc_id: str
    doc_title: str
    chunk_text: str
    score: float


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: list[SourceInfo] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("sources", mode="before")
    @classmethod
    def parse_sources(cls, v: Any) -> list[SourceInfo] | None:
        if v is None:
            return None
        if isinstance(v, str):
            return json.loads(v)
        return v
