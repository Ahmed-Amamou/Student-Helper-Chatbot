import json
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chat import Chat
from app.models.message import Message
from app.models.user import User
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


ENSIT_DISCIPLINES = [
    "Génie Informatique",
    "Génie Mécanique",
    "Génie Électrique",
    "Génie Civil",
    "Mathématiques Appliquées et Modélisation",
    "Génie Industriel",
]


def _build_system_prompt(user: User) -> str:
    """Build a system prompt personalized to the ENSIT student's profile."""
    base = """You are a helpful study assistant for engineering students at ENSIT (École Nationale Supérieure d'Ingénieurs de Tunis). ENSIT is a Tunisian engineering school offering a 3-year "cycle ingénieur" across multiple disciplines: Génie Informatique, Génie Mécanique, Génie Électrique, Génie Civil, Mathématiques Appliquées et Modélisation, and Génie Industriel.

Use the provided context from course materials to answer questions accurately. If the context doesn't cover the question, say so honestly rather than guessing. Be clear, concise, and educational in your responses.

IMPORTANT — Source citations:
When you reference information from a source document, insert an inline citation using this EXACT format: [[src:Document Title]]
- Place the citation right after the sentence or fact it supports.
- Use the document title exactly as it appears in the [Source: ...] header of the context.
- Do NOT write "(Source: ...)" or any other citation format. Only use [[src:Title]].
- You can cite multiple sources in one response.
- Example: "La méthode du simplexe permet de résoudre les programmes linéaires. [[src:RO_ chap. 1]]"

You may answer in French or English depending on the language of the question and course materials."""

    profile_parts = []
    if user.discipline:
        profile_parts.append(f"Discipline: {user.discipline}")
    if user.year_of_study:
        year_labels = {1: "1ère année", 2: "2ème année", 3: "3ème année"}
        profile_parts.append(f"Year: {year_labels.get(user.year_of_study, f'{user.year_of_study}ème année')}")
    if user.semester:
        profile_parts.append(f"Current semester: {user.semester}")
    if user.class_group:
        profile_parts.append(f"Class group: {user.class_group}")

    if profile_parts:
        base += f"\n\nThis student's profile: {', '.join(profile_parts)}. Tailor your answers to their discipline, year level, and curriculum. For example, a 1st-year student needs more foundational explanations, while a 3rd-year student can handle advanced concepts. Focus on content relevant to their specific discipline when possible."

    return base


def _build_pinecone_filter(user: User) -> dict | None:
    """Build a Pinecone metadata filter based on the student's profile.
    Filters by discipline and semester for targeted retrieval."""
    conditions = []
    if user.discipline:
        conditions.append({"discipline": {"$eq": user.discipline}})
    if user.semester:
        conditions.append({"semester": {"$eq": user.semester}})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def _retrieve_context(query: str, user: User, top_k: int = 5) -> list[dict]:
    """Embed query and retrieve relevant chunks from Pinecone.
    First tries filtered by student profile, falls back to unfiltered."""
    query_embedding = embed_query(query)
    index = _get_pinecone_index()

    # Try filtered query first (matching student's discipline/semester)
    pinecone_filter = _build_pinecone_filter(user)
    if pinecone_filter:
        results = index.query(
            vector=query_embedding, top_k=top_k,
            include_metadata=True, filter=pinecone_filter,
        )
        sources = _extract_sources(results)
        if sources:
            return sources

    # Fallback: unfiltered query across all documents
    results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
    return _extract_sources(results)


def _extract_sources(results) -> list[dict]:
    """Extract source info from Pinecone query results."""
    sources = []
    for match in results.matches:
        if match.score >= 0.3:
            meta = match.metadata
            label_parts = [meta.get("doc_title", "")]
            if meta.get("subject"):
                label_parts.insert(0, meta["subject"])
            if meta.get("doc_type"):
                label_parts.append(f"({meta['doc_type']})")

            sources.append({
                "doc_id": meta.get("doc_id", ""),
                "doc_title": " — ".join(filter(None, label_parts)),
                "chunk_text": meta.get("text", ""),
                "score": round(match.score, 4),
            })
    return sources


def _build_messages(chat: Chat, new_content: str, context_chunks: list[dict]) -> list[dict]:
    """Build the message list for OpenAI API (without system — added separately)."""
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
    db: AsyncSession, chat: Chat, user: User, content: str
) -> AsyncGenerator[str, None]:
    """Run the RAG pipeline and stream the response."""
    # 1. Retrieve context (filtered by student profile when available)
    sources = _retrieve_context(content, user)

    # 2. Save user message
    user_msg = Message(chat_id=chat.id, role="user", content=content)
    db.add(user_msg)
    await db.commit()

    # 3. Build prompt and stream response
    system_prompt = _build_system_prompt(user)
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(_build_messages(chat, content, sources))
    client = _get_openai()

    full_response = ""
    stream = await client.chat.completions.create(
        model="gpt-5.4-nano",
        messages=messages,  # type: ignore[arg-type]
        stream=True,
        max_completion_tokens=4096,
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
        model="gpt-5.4-nano",
        max_completion_tokens=20,
        messages=[
            {"role": "system", "content": "You generate short chat titles."},
            {"role": "user", "content": f"Summarize this question in 4-5 words as a chat title. Return ONLY the title, nothing else.\n\n{content}"},
        ],
    )
    return response.choices[0].message.content.strip()
