from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, CredentialsException
from app.core.oauth import verify_google_token
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, LoginRequest, RegisterRequest, TokenResponse


def _make_tokens(user: User) -> TokenResponse:
    data = {"sub": user.id}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


async def register(db: AsyncSession, req: RegisterRequest) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise BadRequestException("Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _make_tokens(user)


async def login(db: AsyncSession, req: LoginRequest) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise CredentialsException()

    return _make_tokens(user)


async def google_auth(db: AsyncSession, req: GoogleAuthRequest) -> TokenResponse:
    payload = verify_google_token(req.token)
    if not payload:
        raise CredentialsException()

    google_sub = payload["sub"]
    email = payload["email"]
    name = payload.get("name", email.split("@")[0])
    picture = payload.get("picture")

    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    if not user:
        # Check if email exists with local auth
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            # Link Google to existing account
            user.google_sub = google_sub
            user.avatar_url = picture
        else:
            user = User(
                email=email,
                full_name=name,
                auth_provider="google",
                google_sub=google_sub,
                avatar_url=picture,
            )
            db.add(user)

    await db.commit()
    await db.refresh(user)
    return _make_tokens(user)
