from fastapi import Request

from app.config import Settings
from app.store import AppStore


def get_store(request: Request) -> AppStore:
    return request.app.state.store


def get_request_settings(request: Request) -> Settings:
    return request.app.state.settings
