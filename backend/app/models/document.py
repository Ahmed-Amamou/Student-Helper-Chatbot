import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.user import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    # Structured metadata
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Analyse Numérique"
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "1Génie Info A"
    semester: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "S2"
    academic_year: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "2023-2024"
    doc_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "cours", "td", "tp", "exam", "emploi"
    uploaded_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    uploaded_by_user: Mapped["User"] = relationship(back_populates="documents")  # noqa: F821
