"""HubSpot OAuth + CRM sync provider.

This module owns every direct interaction with HubSpot: building the OAuth
consent URL, exchanging/refreshing tokens, encrypting tokens at rest, and
writing CRM objects (contact, company, follow-up task).

The store persists connections and sync results; this module performs the
network calls. Nothing here runs unless HubSpot is fully configured
(`settings.hubspot_configured`), so mock mode keeps working untouched.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.config import Settings

AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize"
TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"
API_BASE = "https://api.hubapi.com"

# Refresh a bit before the real expiry to avoid racing the boundary.
_REFRESH_SKEW = timedelta(seconds=120)
_TIMEOUT = httpx.Timeout(10.0)


class HubSpotError(RuntimeError):
    """Raised when HubSpot is misconfigured or an API call fails."""


def is_configured(settings: Settings) -> bool:
    return settings.hubspot_configured


def _require_configured(settings: Settings) -> None:
    if not settings.hubspot_configured:
        raise HubSpotError(
            "HubSpot is not configured. Set HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, "
            "HUBSPOT_REDIRECT_URI, and HUBSPOT_TOKEN_ENCRYPTION_KEY."
        )


# --- OAuth --------------------------------------------------------------


def build_authorize_url(settings: Settings, state: str) -> str:
    _require_configured(settings)
    params = {
        "client_id": settings.hubspot_client_id,
        "redirect_uri": settings.hubspot_redirect_uri,
        "scope": settings.hubspot_scopes,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_code(settings: Settings, code: str) -> dict:
    """Exchange an authorization code for access + refresh tokens."""
    _require_configured(settings)
    data = {
        "grant_type": "authorization_code",
        "client_id": settings.hubspot_client_id,
        "client_secret": settings.hubspot_client_secret,
        "redirect_uri": settings.hubspot_redirect_uri,
        "code": code,
    }
    return await _token_request(data)


async def refresh_access_token(settings: Settings, refresh_token: str) -> dict:
    _require_configured(settings)
    data = {
        "grant_type": "refresh_token",
        "client_id": settings.hubspot_client_id,
        "client_secret": settings.hubspot_client_secret,
        "refresh_token": refresh_token,
    }
    return await _token_request(data)


async def _token_request(data: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if response.status_code != 200:
        raise HubSpotError(f"HubSpot token request failed ({response.status_code}): {response.text}")
    payload = response.json()
    # Stamp an absolute expiry so refresh logic doesn't depend on wall-clock at read time.
    expires_in = int(payload.get("expires_in", 1800))
    payload["expires_at"] = (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat()
    return payload


async def get_account_id(access_token: str) -> str | None:
    """Return the HubSpot portal (hub) id for the granted token, for display."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(
            f"{API_BASE}/oauth/v1/access-tokens/{access_token}",
        )
    if response.status_code != 200:
        return None
    return str(response.json().get("hub_id")) if response.json().get("hub_id") else None


# --- Token encryption ---------------------------------------------------


def _fernet(settings: Settings) -> Fernet:
    _require_configured(settings)
    try:
        return Fernet(settings.hubspot_token_encryption_key.encode())
    except (ValueError, TypeError) as exc:
        raise HubSpotError("HUBSPOT_TOKEN_ENCRYPTION_KEY is not a valid Fernet key.") from exc


def encrypt_tokens(settings: Settings, tokens: dict) -> str:
    return _fernet(settings).encrypt(json.dumps(tokens).encode()).decode()


def decrypt_tokens(settings: Settings, blob: str) -> dict:
    try:
        return json.loads(_fernet(settings).decrypt(blob.encode()).decode())
    except (InvalidToken, ValueError) as exc:
        raise HubSpotError("Stored HubSpot tokens could not be decrypted.") from exc


async def ensure_access_token(settings: Settings, encrypted_blob: str) -> tuple[str, str | None]:
    """Return a valid access token, refreshing if needed.

    Returns (access_token, new_encrypted_blob_or_None). When the token was
    refreshed, the caller should persist the returned blob.
    """
    tokens = decrypt_tokens(settings, encrypted_blob)
    expires_at = tokens.get("expires_at")
    still_valid = False
    if expires_at:
        try:
            still_valid = datetime.fromisoformat(expires_at) - _REFRESH_SKEW > datetime.now(UTC)
        except ValueError:
            still_valid = False
    if still_valid:
        return tokens["access_token"], None

    refreshed = await refresh_access_token(settings, tokens["refresh_token"])
    # HubSpot may omit refresh_token on refresh; keep the existing one.
    refreshed.setdefault("refresh_token", tokens.get("refresh_token"))
    new_blob = encrypt_tokens(settings, refreshed)
    return refreshed["access_token"], new_blob


# --- CRM writes ---------------------------------------------------------


async def _create_object(access_token: str, object_type: str, properties: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            f"{API_BASE}/crm/v3/objects/{object_type}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"properties": properties},
        )
    if response.status_code not in (200, 201):
        raise HubSpotError(
            f"HubSpot {object_type} create failed ({response.status_code}): {response.text}"
        )
    return response.json()


async def sync_report(access_token: str, *, contact: dict, company: dict, task: dict) -> dict:
    """Create a contact, company, and follow-up task; return external ids + url.

    Each argument is a HubSpot `properties` dict. Empty dicts are skipped.
    """
    external_ids: dict[str, str | None] = {
        "hubspot_contact_id": None,
        "hubspot_company_id": None,
        "hubspot_task_id": None,
    }

    if company:
        company_obj = await _create_object(access_token, "companies", company)
        external_ids["hubspot_company_id"] = company_obj.get("id")
    if contact:
        contact_obj = await _create_object(access_token, "contacts", contact)
        external_ids["hubspot_contact_id"] = contact_obj.get("id")
    if task:
        task_obj = await _create_object(access_token, "tasks", task)
        external_ids["hubspot_task_id"] = task_obj.get("id")

    contact_id = external_ids["hubspot_contact_id"]
    external_ids["external_url"] = (
        f"https://app.hubspot.com/contacts/{contact_id}" if contact_id else None
    )
    external_ids["message"] = "Synced contact, company, and follow-up task to HubSpot."
    return external_ids
