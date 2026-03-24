from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.chat import Chat
from app.models.user import User


async def list_chats(db: AsyncSession, user: User) -> list[Chat]:
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == user.id)
        .order_by(Chat.updated_at.desc())
    )
    return list(result.scalars().all())


async def create_chat(db: AsyncSession, user: User, title: str = "New Chat") -> Chat:
    chat = Chat(user_id=user.id, title=title)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


async def get_chat(db: AsyncSession, chat_id: str, user: User) -> Chat:
    result = await db.execute(
        select(Chat)
        .options(selectinload(Chat.messages))
        .where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise NotFoundException("Chat not found")
    if chat.user_id != user.id:
        raise ForbiddenException()
    return chat


async def update_chat(db: AsyncSession, chat_id: str, user: User, title: str) -> Chat:
    chat = await get_chat(db, chat_id, user)
    chat.title = title
    await db.commit()
    await db.refresh(chat)
    return chat


async def delete_chat(db: AsyncSession, chat_id: str, user: User) -> None:
    chat = await get_chat(db, chat_id, user)
    await db.delete(chat)
    await db.commit()
