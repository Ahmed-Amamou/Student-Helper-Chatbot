import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import settings


async def send_verification_email(to_email: str, full_name: str, token: str) -> None:
    """Send a verification email with a link to confirm the account."""
    verify_url = f"{settings.FRONTEND_URL}/verify?token={token}"

    html = f"""\
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #6366f1; margin: 0;">Student Helper — ENSIT</h2>
        </div>
        <p>Bonjour <strong>{full_name}</strong>,</p>
        <p>Welcome to Student Helper! Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{verify_url}"
               style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px;
                      text-decoration: none; font-weight: 600; display: inline-block;">
                Verify My Email
            </a>
        </div>
        <p style="color: #888; font-size: 13px;">
            Or copy this link into your browser:<br/>
            <a href="{verify_url}" style="color: #6366f1;">{verify_url}</a>
        </p>
        <p style="color: #888; font-size: 13px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #aaa; font-size: 12px; text-align: center;">
            ENSIT — École Nationale Supérieure d'Ingénieurs de Tunis
        </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your Student Helper account"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
    except Exception as e:
        # Log but don't crash — user can resend verification later
        print(f"[EMAIL] Failed to send verification to {to_email}: {e}")
