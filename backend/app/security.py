"""Password hashing and JWT session tokens for enterprise + employee auth."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import Settings

# Fallback secret for local development when AUTH_JWT_SECRET is unset.
# Regenerated per process, so tokens do not survive a restart — set the
# env var for anything beyond a single local session.
_EPHEMERAL_SECRET = secrets.token_hex(32)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def _secret(settings: Settings) -> str:
    return settings.auth_jwt_secret or _EPHEMERAL_SECRET


def create_session_token(settings: Settings, user: dict) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user["id"],
        "org": user["organization_id"],
        "role": user["role"],
        "name": user["name"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.auth_token_ttl_hours)).timestamp()),
    }
    return jwt.encode(payload, _secret(settings), algorithm=ALGORITHM)


def decode_session_token(settings: Settings, token: str) -> dict | None:
    """Return the token claims, or None when invalid/expired."""
    try:
        return jwt.decode(token, _secret(settings), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def generate_invite_code() -> str:
    # URL-safe, human-shareable: e.g. "JOIN-9F3K2M8Q"
    return f"JOIN-{secrets.token_hex(4).upper()}"
