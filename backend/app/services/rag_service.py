import json
from collections.abc import AsyncGenerator

import anthropic
from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chat import Chat
from app.models.message import Message
from app.services.embedding_service import embed_query

_pinecone: Pinecone | None = None
_anthropic: anthropic.AsyncAnthropic | None = None


def _get_pinecone_index():
    global _pinecone
    if _pinecone is None:
        _pinecone = Pinecone(api_key=settings.PINECONE_API_KEY)
    return _pinecone.Index(settings.PINECONE_INDEX_NAME)


def _get_anthropic():
    global _anthropic
    if _anthropic is None:
        _anthropic = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _anthropic


SYSTEM_PROMPT = """You are a helpful study assistant for engineering students. Use the provided context from course materials to answer questions accurately. Always cite which document your information comes from when possible.

If the context doesn't cover the question, say so honestly rather than guessing. Be clear, concise, and educational in your responses."""


def _retrieve_context(query: str, top_k: int = 5) -> list[dict]:
    """Embed query and retrieve relevant chunks from Pinecone."""
    query_embedding = embed_query(query)
    index = _get_pinecone_index()
    results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)

    sources = []
    for match in results.matches:
        if match.score >= 0.7:
            sources.append({
                "doc_id": match.metadata.get("doc_id", ""),
                "doc_title": match.metadata.get("doc_title", ""),
                "chunk_text": match.metadata.get("text", ""),
                "score": round(match.score, 4),
            })
    return sources


def _build_messages(chat: Chat, new_content: str, context_chunks: list[dict]) -> list[dict]:
    """Build the message list for Claude API."""
    messages = []

    # Add last 10 messages from history
    for msg in chat.messages[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Build user message with context
    if context_chunks:
        context_block = "\n---\n".join(
            f"[Source: {c['doc_title']}]\n{c['chunk_text']}" for c in context_chunks
        )
        user_content = f"Context from knowledge base:\n---\n{context_block}\n---\n\nQuestion: {new_content}"
    else:
        user_content = new_content

    messages.append({"role": "user", "content": user_content})
    return messages


async def stream_rag_response(
    db: AsyncSession, chat: Chat, content: str
) -> AsyncGenerator[str, None]:
    """Run the RAG pipeline and stream the response."""
    # 1. Retrieve context
    sources = _retrieve_context(content)

    # 2. Save user message
    user_msg = Message(chat_id=chat.id, role="user", content=content)
    db.add(user_msg)
    await db.commit()

    # 3. Build prompt and stream Claude response
    messages = _build_messages(chat, content, sources)
    client = _get_anthropic()

    full_response = ""
    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            full_response += text
            yield json.dumps({"type": "text", "content": text})

    # 4. Save assistant message with sources
    assistant_msg = Message(
        chat_id=chat.id,
        role="assistant",
        content=full_response,
        sources=json.dumps(sources) if sources else None,
    )
    db.add(assistant_msg)
    await db.commit()

    # 5. Yield sources at the end
    if sources:
        yield json.dumps({"type": "sources", "content": sources})

    yield json.dumps({"type": "done"})


async def generate_chat_title(content: str) -> str:
    """Generate a short title for a chat based on the first message."""
    client = _get_anthropic()
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[
            {"role": "user", "content": f"Summarize this question in 4-5 words as a chat title. Return ONLY the title, nothing else.\n\n{content}"}
        ],
    )
    return response.content[0].text.strip()
