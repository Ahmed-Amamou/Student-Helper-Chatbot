from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import settings


def verify_google_token(token: str) -> dict | None:
    """Verify a Google ID token and return the payload."""
    try:
        payload = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        return payload
    except Exception:
        return None
