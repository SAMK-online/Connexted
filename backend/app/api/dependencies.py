from fastapi import Request

from app.config import Settings
from app.store import AppStore


def get_store(request: Request) -> AppStore:
    return request.app.state.store


def get_request_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_auth_claims(request: Request) -> dict | None:
    """JWT claims for the signed-in user, or None (demo mode / shared token)."""
    return getattr(request.state, "auth_claims", None)
