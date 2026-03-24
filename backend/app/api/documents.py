from fastapi import APIRouter, BackgroundTasks, Depends, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.formparsers import MultiPartParser

from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.dependencies import require_admin
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.document_service import delete_document_vectors, process_document

# Raise the default 1MB multipart limit to 50MB
MultiPartParser.max_file_size = 50 * 1024 * 1024

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx", "pptx", "txt", "md"}


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return list(result.scalars().all())


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    subject: str = Form(default=""),
    class_name: str = Form(default=""),
    semester: str = Form(default=""),
    academic_year: str = Form(default=""),
    doc_type: str = Form(default=""),
):
    if not file.filename:
        raise BadRequestException("No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise BadRequestException(f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_TYPES)}")

    file_bytes = await file.read()
    title = file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename

    doc = Document(
        title=title,
        filename=file.filename,
        file_type=ext,
        file_size=len(file_bytes),
        uploaded_by=admin.id,
        subject=subject or None,
        class_name=class_name or None,
        semester=semester or None,
        academic_year=academic_year or None,
        doc_type=doc_type or None,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process in background
    background_tasks.add_task(_process_in_background, doc.id, file_bytes)

    return doc


async def _process_in_background(doc_id: str, file_bytes: bytes):
    """Run document processing with a fresh DB session."""
    from app.database import async_session

    async with async_session() as db:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one()
        await process_document(db, doc, file_bytes)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundException("Document not found")
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundException("Document not found")

    await delete_document_vectors(doc.id)
    await db.delete(doc)
    await db.commit()
