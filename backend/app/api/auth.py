from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserProfileUpdate, UserResponse
from app.services import auth_service
from app.core.security import decode_token, create_access_token, create_refresh_token
from app.core.exceptions import CredentialsException

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.register(db, req)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.login(db, req)


@router.post("/google", response_model=TokenResponse)
async def google_login(req: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.google_auth(db, req)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise CredentialsException()
    data = {"sub": payload["sub"]}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    req: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.class_name is not None:
        current_user.class_name = req.class_name
    if req.semester is not None:
        current_user.semester = req.semester
    if req.year is not None:
        current_user.year = req.year
    await db.commit()
    await db.refresh(current_user)
    return current_user
