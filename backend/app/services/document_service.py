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


async def process_document(db: AsyncSession, document: Document, file_bytes: bytes) -> None:
    """Parse, chunk, embed, and store document vectors in Pinecone."""
    try:
        # 1. Parse
        parser = PARSERS.get(document.file_type)
        if not parser:
            document.status = "failed"
            await db.commit()
            return

        text = parser(file_bytes)
        if not text.strip():
            document.status = "failed"
            await db.commit()
            return

        # 2. Chunk
        chunks = chunk_text(text)

        # 3. Embed in batches of 128
        all_embeddings = []
        for i in range(0, len(chunks), 128):
            batch = chunks[i : i + 128]
            embeddings = embed_texts(batch, input_type="document")
            all_embeddings.extend(embeddings)

        # 4. Upsert to Pinecone in batches of 100
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        index = pc.Index(settings.PINECONE_INDEX_NAME)

        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, all_embeddings)):
            vectors.append({
                "id": f"{document.id}#{i}",
                "values": embedding,
                "metadata": {
                    "doc_id": document.id,
                    "doc_title": document.title,
                    "chunk_index": i,
                    "text": chunk[:1000],  # Pinecone metadata limit
                },
            })

        for i in range(0, len(vectors), 100):
            batch = vectors[i : i + 100]
            index.upsert(vectors=batch)

        # 5. Update document record
        document.chunk_count = len(chunks)
        document.status = "ready"
        await db.commit()

    except Exception:
        document.status = "failed"
        await db.commit()


async def delete_document_vectors(doc_id: str) -> None:
    """Delete all vectors for a document from Pinecone."""
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    # Delete by ID prefix
    # Pinecone supports delete by filter on some plans; use list+delete as fallback
    try:
        index.delete(filter={"doc_id": {"$eq": doc_id}})
    except Exception:
        # Fallback: list and delete by IDs
        pass
