import json
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chat import Chat
from app.models.message import Message
from app.services.embedding_service import embed_query

_pinecone: Pinecone | None = None
_openai: AsyncOpenAI | None = None


def _get_pinecone_index():
    global _pinecone
    if _pinecone is None:
        _pinecone = Pinecone(api_key=settings.PINECONE_API_KEY)
    return _pinecone.Index(settings.PINECONE_INDEX_NAME)


def _get_openai():
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai


SYSTEM_PROMPT = """You are a helpful study assistant for engineering students. Use the provided context from course materials to answer questions accurately. Always cite which document your information comes from when possible.

If the context doesn't cover the question, say so honestly rather than guessing. Be clear, concise, and educational in your responses."""


def _retrieve_context(query: str, top_k: int = 3) -> list[dict]:
    """Embed query and retrieve relevant chunks from Pinecone."""
    query_embedding = embed_query(query)
    index = _get_pinecone_index()
    results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)

    sources = []
    for match in results.matches:
        if match.score >= 0.3:
            sources.append({
                "doc_id": match.metadata.get("doc_id", ""),
                "doc_title": match.metadata.get("doc_title", ""),
                "chunk_text": match.metadata.get("text", ""),
                "score": round(match.score, 4),
            })
    return sources


def _build_messages(chat: Chat, new_content: str, context_chunks: list[dict]) -> list[dict]:
    """Build the message list for OpenAI API."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

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

    # 3. Build prompt and stream OpenAI response
    messages = _build_messages(chat, content, sources)
    client = _get_openai()

    full_response = ""
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,  # type: ignore[arg-type]
        stream=True,
        max_tokens=4096,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            full_response += delta
            yield json.dumps({"type": "text", "content": delta})

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
    client = _get_openai()
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=20,
        messages=[
            {"role": "system", "content": "You generate short chat titles."},
            {"role": "user", "content": f"Summarize this question in 4-5 words as a chat title. Return ONLY the title, nothing else.\n\n{content}"},
        ],
    )
    return response.choices[0].message.content.strip()
