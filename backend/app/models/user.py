import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    auth_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="local")
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    discipline: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Génie Informatique"
    year_of_study: Mapped[int | None] = mapped_column(nullable=True)  # 1, 2, or 3
    semester: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "S1"
    class_group: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "A", "B"
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    chats: Mapped[list["Chat"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    documents: Mapped[list["Document"]] = relationship(back_populates="uploaded_by_user")  # noqa: F821
