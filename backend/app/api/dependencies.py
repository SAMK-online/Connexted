from fastapi import Request

from app.config import Settings
from app.store import InMemoryStore


def get_store(request: Request) -> InMemoryStore:
    return request.app.state.store


def get_request_settings(request: Request) -> Settings:
    return request.app.state.settings

