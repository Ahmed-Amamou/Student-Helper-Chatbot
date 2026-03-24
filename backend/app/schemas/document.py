from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    status: str
    uploaded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
