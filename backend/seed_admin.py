"""Create the initial admin account. Run once after fresh DB setup."""
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.database import async_session, engine
from app.models.user import Base, User


async def seed():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        email = "admin@ensit.u-tunis.tn"
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"Admin account already exists: {email}")
            return

        admin = User(
            email=email,
            password_hash=hash_password("admin123"),
            full_name="Admin ENSIT",
            role="admin",
            is_verified=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Admin account created!")
        print(f"  Email:    {email}")
        print(f"  Password: admin123")
        print(f"  Role:     admin")


if __name__ == "__main__":
    asyncio.run(seed())
