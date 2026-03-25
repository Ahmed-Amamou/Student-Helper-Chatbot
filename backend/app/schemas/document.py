from datetime import datetime

from pydantic import BaseModel


class DocumentUploadMeta(BaseModel):
    subject: str | None = None
    discipline: str | None = None
    year_of_study: int | None = None
    semester: str | None = None
    doc_type: str | None = None  # cours, td, tp, exam, emploi


class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    status: str
    subject: str | None
    discipline: str | None
    year_of_study: int | None
    semester: str | None
    doc_type: str | None
    uploaded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
