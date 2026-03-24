from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.message import MessageCreate
from app.services import chat_service, rag_service

router = APIRouter(prefix="/chats/{chat_id}/messages", tags=["messages"])


@router.post("/")
async def send_message(
    chat_id: str,
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = await chat_service.get_chat(db, chat_id, current_user)

    # Auto-title on first message
    if chat.title == "New Chat" and len(chat.messages) == 0:
        try:
            title = await rag_service.generate_chat_title(req.content)
            chat.title = title
            await db.commit()
        except Exception:
            pass

    async def event_generator():
        async for chunk in rag_service.stream_rag_response(db, chat, current_user, req.content):
            yield {"data": chunk}

    return EventSourceResponse(event_generator())
