from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings

_TIMEOUT = httpx.Timeout(15.0)


class ProspeoError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def is_configured(settings: Settings) -> bool:
    return bool(settings.prospeo_api_key)


async def enrich_company(settings: Settings, data: dict[str, Any]) -> dict[str, Any]:
    return await _post(settings, "/enrich-company", {"data": data})


async def enrich_person(
    settings: Settings,
    data: dict[str, Any],
    *,
    only_verified_email: bool,
    enrich_mobile: bool,
) -> dict[str, Any]:
    return await _post(
        settings,
        "/enrich-person",
        {
            "only_verified_email": only_verified_email,
            "enrich_mobile": enrich_mobile,
            "data": data,
        },
    )


async def _post(settings: Settings, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.prospeo_api_key:
        raise ProspeoError("NOT_CONFIGURED", "PROSPEO_API_KEY is not configured.")

    base_url = settings.prospeo_base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            f"{base_url}{path}",
            headers={
                "Content-Type": "application/json",
                "X-KEY": settings.prospeo_api_key,
            },
            json=payload,
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise ProspeoError(
            f"HTTP_{response.status_code}",
            f"Prospeo returned a non-JSON response ({response.status_code}).",
        ) from exc

    if response.status_code not in (200, 400, 429):
        raise ProspeoError(
            f"HTTP_{response.status_code}",
            f"Prospeo request failed with HTTP {response.status_code}.",
        )
    if body.get("error"):
        code = str(body.get("error_code") or f"HTTP_{response.status_code}")
        raise ProspeoError(code, f"Prospeo enrichment failed with {code}.")
    return body
