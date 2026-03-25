import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import BadRequestException, CredentialsException
from app.core.oauth import verify_google_token
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, LoginRequest, RegisterRequest, TokenResponse
from app.services.email_service import send_verification_email


def _make_tokens(user: User) -> TokenResponse:
    data = {"sub": user.id}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


def _validate_ensit_email(email: str) -> None:
    """Ensure the email belongs to the allowed ENSIT domain."""
    domain = email.split("@")[-1].lower()
    if domain != settings.ALLOWED_EMAIL_DOMAIN:
        raise BadRequestException(
            f"Only @{settings.ALLOWED_EMAIL_DOMAIN} email addresses are allowed."
        )


async def register(db: AsyncSession, req: RegisterRequest) -> dict:
    """Register a new user, send verification email. Returns a message (no tokens yet)."""
    _validate_ensit_email(req.email)

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise BadRequestException("Email already registered")

    verification_token = secrets.token_urlsafe(48)

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        is_verified=False,
        verification_token=verification_token,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email (fire-and-forget, don't block response)
    await send_verification_email(req.email, req.full_name, verification_token)

    return {"message": "Account created. Please check your email to verify your account."}


async def verify_email(db: AsyncSession, token: str) -> TokenResponse:
    """Verify a user's email with the token and return auth tokens."""
    result = await db.execute(
        select(User).where(User.verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise BadRequestException("Invalid or expired verification link.")

    user.is_verified = True
    user.verification_token = None
    await db.commit()
    await db.refresh(user)

    return _make_tokens(user)


async def resend_verification(db: AsyncSession, email: str) -> dict:
    """Resend verification email for an unverified account."""
    _validate_ensit_email(email)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Don't reveal whether account exists
        return {"message": "If this email is registered, a verification link has been sent."}

    if user.is_verified:
        raise BadRequestException("This account is already verified.")

    verification_token = secrets.token_urlsafe(48)
    user.verification_token = verification_token
    await db.commit()

    await send_verification_email(email, user.full_name, verification_token)

    return {"message": "If this email is registered, a verification link has been sent."}


async def login(db: AsyncSession, req: LoginRequest) -> TokenResponse:
    _validate_ensit_email(req.email)

    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise CredentialsException()

    if not user.is_verified:
        raise BadRequestException("Please verify your email before logging in. Check your inbox.")

    return _make_tokens(user)


async def google_auth(db: AsyncSession, req: GoogleAuthRequest) -> TokenResponse:
    payload = verify_google_token(req.token)
    if not payload:
        raise CredentialsException()

    google_sub = payload["sub"]
    email = payload["email"]

    # Validate ENSIT domain for Google auth too
    _validate_ensit_email(email)

    name = payload.get("name", email.split("@")[0])
    picture = payload.get("picture")

    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.google_sub = google_sub
            user.avatar_url = picture
        else:
            # Google-authenticated users are auto-verified (Google already verified the email)
            user = User(
                email=email,
                full_name=name,
                auth_provider="google",
                google_sub=google_sub,
                avatar_url=picture,
                is_verified=True,
            )
            db.add(user)

    await db.commit()
    await db.refresh(user)
    return _make_tokens(user)
