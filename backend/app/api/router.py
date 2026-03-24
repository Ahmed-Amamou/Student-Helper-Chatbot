from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.chats import router as chats_router
from app.api.documents import router as documents_router
from app.api.messages import router as messages_router
from app.api.users import router as users_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(chats_router)
api_router.include_router(messages_router)
api_router.include_router(documents_router)
api_router.include_router(users_router)
