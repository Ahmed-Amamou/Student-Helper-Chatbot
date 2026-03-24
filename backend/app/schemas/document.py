from datetime import datetime

from pydantic import BaseModel


class DocumentUploadMeta(BaseModel):
    subject: str | None = None
    class_name: str | None = None
    semester: str | None = None
    academic_year: str | None = None
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
    class_name: str | None
    semester: str | None
    academic_year: str | None
    doc_type: str | None
    uploaded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
