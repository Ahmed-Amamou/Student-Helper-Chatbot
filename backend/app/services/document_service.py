from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.document import Document
from app.processing.chunker import chunk_text
from app.processing.docx_parser import parse_docx
from app.processing.pdf_parser import parse_pdf
from app.processing.pptx_parser import parse_pptx
from app.processing.text_parser import parse_text
from app.services.embedding_service import embed_texts

PARSERS = {
    "pdf": parse_pdf,
    "docx": parse_docx,
    "pptx": parse_pptx,
    "txt": parse_text,
    "md": parse_text,
}


async def _set_status(db: AsyncSession, document: Document, status: str) -> None:
    """Update document status and commit immediately so polling picks it up."""
    document.status = status
    await db.commit()


def _build_metadata_prefix(document: Document) -> str:
    """Build a descriptive prefix from document metadata to prepend to each chunk.
    This ensures the embedding vector captures the document's context."""
    parts = []
    if document.subject:
        parts.append(f"Subject: {document.subject}")
    if document.discipline:
        parts.append(f"Discipline: {document.discipline}")
    if document.year_of_study:
        parts.append(f"Year: {document.year_of_study}")
    if document.semester:
        parts.append(f"Semester: {document.semester}")
    if document.doc_type:
        parts.append(f"Type: {document.doc_type}")
    parts.append(f"Document: {document.title}")
    return " | ".join(parts)


async def process_document(db: AsyncSession, document: Document, file_bytes: bytes) -> None:
    """Parse, chunk, embed, and store document vectors in Pinecone."""
    try:
        # 1. Parse
        await _set_status(db, document, "parsing")
        parser = PARSERS.get(document.file_type)
        if not parser:
            await _set_status(db, document, "failed")
            return

        text = parser(file_bytes)
        if not text.strip():
            await _set_status(db, document, "failed")
            return

        # 2. Chunk
        await _set_status(db, document, "chunking")
        chunks = chunk_text(text)

        # Update chunk count immediately so the UI shows it
        document.chunk_count = len(chunks)
        await db.commit()

        # Brief pause so the polling UI catches the "chunking" step
        import asyncio
        await asyncio.sleep(1.5)

        # 3. Prepend metadata context to each chunk for richer embeddings
        metadata_prefix = _build_metadata_prefix(document)
        enriched_chunks = [f"{metadata_prefix}\n\n{chunk}" for chunk in chunks]

        # 4. Embed in batches of 128
        await _set_status(db, document, "embedding")
        all_embeddings = []
        for i in range(0, len(enriched_chunks), 128):
            batch = enriched_chunks[i : i + 128]
            embeddings = embed_texts(batch, input_type="document")
            all_embeddings.extend(embeddings)

        # 5. Upsert to Pinecone in batches of 100
        await _set_status(db, document, "storing")
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        index = pc.Index(settings.PINECONE_INDEX_NAME)

        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, all_embeddings)):
            metadata = {
                "doc_id": document.id,
                "doc_title": document.title,
                "chunk_index": i,
                "text": chunk[:1000],
            }
            if document.subject:
                metadata["subject"] = document.subject
            if document.discipline:
                metadata["discipline"] = document.discipline
            if document.year_of_study:
                metadata["year_of_study"] = document.year_of_study
            if document.semester:
                metadata["semester"] = document.semester
            if document.doc_type:
                metadata["doc_type"] = document.doc_type

            vectors.append({
                "id": f"{document.id}#{i}",
                "values": embedding,
                "metadata": metadata,
            })

        for i in range(0, len(vectors), 100):
            batch = vectors[i : i + 100]
            index.upsert(vectors=batch)

        # 6. Done
        await _set_status(db, document, "ready")

    except Exception as e:
        import traceback
        print(f"[DOCUMENT] Processing failed for '{document.title}': {e}")
        traceback.print_exc()
        await _set_status(db, document, "failed")


async def delete_document_vectors(doc_id: str) -> None:
    """Delete all vectors for a document from Pinecone."""
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    try:
        index.delete(filter={"doc_id": {"$eq": doc_id}})
    except Exception:
        pass
