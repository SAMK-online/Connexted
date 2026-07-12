from __future__ import annotations

import re
from datetime import UTC, datetime, time
from typing import Any

import httpx

from app.config import Settings
from app.schemas import (
    ConfidenceLabel,
    Playbook,
    SocialIntentDiscoveryRead,
    SocialIntentDiscoveryRequest,
    SocialPostCandidate,
    new_id,
    utc_now,
)

_TIMEOUT = httpx.Timeout(15.0)
_PROFILE_URLS = {
    "linkedin": "https://www.linkedin.com/in/",
    "x": "https://x.com/",
}


class SocialProviderError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


async def discover_social_intent(
    payload: SocialIntentDiscoveryRequest,
    settings: Settings,
    playbook: Playbook | None = None,
) -> SocialIntentDiscoveryRead:
    discovery_id = new_id("socdisc")
    query = _build_x_query(payload)
    warnings: list[str] = []
    candidates = _manual_candidates(payload, discovery_id, query, playbook)
    wants_x = any(platform.lower() in {"x", "twitter"} for platform in payload.platforms)

    if wants_x and not settings.mock_providers and settings.x_bearer_token:
        try:
            candidates.extend(await _x_recent_search(payload, discovery_id, query, settings, playbook))
        except SocialProviderError as exc:
            warnings.append(f"X search failed ({exc.code}); showing sample candidates instead.")
            candidates.extend(_mock_candidates(payload, discovery_id, query, playbook))
    elif wants_x:
        warnings.append(
            "Social Intent Radar is using sample posts until X_BEARER_TOKEN is configured "
            "and MOCK_PROVIDERS=false."
        )
        candidates.extend(_mock_candidates(payload, discovery_id, query, playbook))

    deduped = _dedupe_candidates(candidates)[: payload.max_posts]
    if not deduped:
        warnings.append("No public social posts matched the event inputs yet.")

    return SocialIntentDiscoveryRead(
        id=discovery_id,
        organization_id=payload.organization_id,
        rep_id=payload.rep_id,
        request=payload,
        candidates=deduped,
        warnings=warnings,
    )


async def _x_recent_search(
    payload: SocialIntentDiscoveryRequest,
    discovery_id: str,
    query: str,
    settings: Settings,
    playbook: Playbook | None,
) -> list[SocialPostCandidate]:
    if not settings.x_bearer_token:
        raise SocialProviderError("NOT_CONFIGURED", "X_BEARER_TOKEN is not configured.")

    params: dict[str, str | int] = {
        "query": query,
        "max_results": min(100, max(10, payload.max_posts)),
        "sort_order": "recency",
        "tweet.fields": "author_id,created_at,entities,lang,public_metrics",
        "expansions": "author_id",
        "user.fields": "description,location,name,username,url,verified,verified_type",
    }
    if payload.date_start:
        params["start_time"] = _x_time_param(payload.date_start, end=False)
    if payload.date_end:
        params["end_time"] = _x_time_param(payload.date_end, end=True)

    url = f"{settings.x_api_base_url.rstrip('/')}/tweets/search/recent"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {settings.x_bearer_token}"},
            params=params,
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise SocialProviderError(
            f"HTTP_{response.status_code}",
            f"X returned a non-JSON response ({response.status_code}).",
        ) from exc

    if response.status_code >= 400:
        detail = body.get("title") or body.get("detail") or body.get("errors") or "request failed"
        raise SocialProviderError(f"HTTP_{response.status_code}", str(detail))

    users = {
        str(user.get("id")): user
        for user in body.get("includes", {}).get("users", [])
        if user.get("id")
    }
    candidates: list[SocialPostCandidate] = []
    for post in body.get("data", []):
        text = str(post.get("text") or "").strip()
        if not text:
            continue
        user = users.get(str(post.get("author_id")), {})
        handle = user.get("username")
        posted_at = _parse_datetime(post.get("created_at"))
        candidates.append(
            _candidate_from_post(
                payload=payload,
                discovery_id=discovery_id,
                platform="x",
                post_text=text,
                post_url=(
                    f"https://x.com/{handle}/status/{post.get('id')}"
                    if handle and post.get("id")
                    else None
                ),
                source_query=query,
                playbook=playbook,
                author_name=user.get("name") or handle,
                author_handle=f"@{handle}" if handle else None,
                author_profile_url=f"https://x.com/{handle}" if handle else None,
                author_company=_company_from_profile(user.get("description")),
                posted_at=posted_at,
            )
        )
    return candidates


def _mock_candidates(
    payload: SocialIntentDiscoveryRequest,
    discovery_id: str,
    query: str,
    playbook: Playbook | None,
) -> list[SocialPostCandidate]:
    sector = playbook.target_sectors[0] if playbook and playbook.target_sectors else "B2B SaaS"
    persona = (
        playbook.target_personas[0] if playbook and playbook.target_personas else "Revenue leader"
    )
    product = (
        playbook.products_offered[0]
        if playbook and playbook.products_offered
        else "event conversation intelligence"
    )
    event = payload.event_name.strip() or "the event"
    hashtag = _clean_hashtag(payload.hashtags[0]) if payload.hashtags else _event_hashtag(event)
    specs = [
        {
            "name": "Maya Patel",
            "handle": "@mayapatelgtm",
            "company": f"{sector} Operator Co.",
            "title": persona,
            "text": (
                f"Heading to {event} next week. Looking to compare notes with teams turning "
                f"event conversations into qualified pipeline. {hashtag}"
            ),
        },
        {
            "name": "Daniel Kim",
            "handle": "@dankimrevops",
            "company": "Pipeline Systems Group",
            "title": "RevOps Director",
            "text": (
                f"We will be around {event} and taking meetings on booth follow-up, CRM hygiene, "
                f"and faster sales handoff. Curious who is using {product}."
            ),
        },
        {
            "name": "Ari Singh",
            "handle": "@arisingh",
            "company": "Partner Motion Labs",
            "title": "Head of Partnerships",
            "text": (
                f"Speaking at {event} about partner-sourced pipeline. Open to dinner meetings "
                "with teams improving event-led GTM."
            ),
        },
    ]
    return [
        _candidate_from_post(
            payload=payload,
            discovery_id=discovery_id,
            platform="x",
            post_text=spec["text"],
            post_url=None,
            source_query=query,
            playbook=playbook,
            author_name=spec["name"],
            author_handle=spec["handle"],
            author_profile_url=f"https://x.com/{spec['handle'].lstrip('@')}",
            author_company=spec["company"],
            author_title=spec["title"],
            posted_at=utc_now(),
        )
        for spec in specs
    ]


def _manual_candidates(
    payload: SocialIntentDiscoveryRequest,
    discovery_id: str,
    query: str,
    playbook: Playbook | None,
) -> list[SocialPostCandidate]:
    chunks = _pasted_post_chunks(payload.pasted_posts)
    candidates = []
    for chunk in chunks[: payload.max_posts]:
        platform = _platform_from_text(chunk)
        handle = _handle_from_text(chunk)
        candidates.append(
            _candidate_from_post(
                payload=payload,
                discovery_id=discovery_id,
                platform=platform,
                post_text=chunk,
                post_url=_url_from_text(chunk),
                source_query=query,
                playbook=playbook,
                author_name=handle or "Public social poster",
                author_handle=handle,
                author_profile_url=_profile_url(platform, handle),
                posted_at=None,
            )
        )
    return candidates


def _candidate_from_post(
    *,
    payload: SocialIntentDiscoveryRequest,
    discovery_id: str,
    platform: str,
    post_text: str,
    post_url: str | None,
    source_query: str | None,
    playbook: Playbook | None,
    author_name: str | None = None,
    author_handle: str | None = None,
    author_profile_url: str | None = None,
    author_company: str | None = None,
    author_title: str | None = None,
    posted_at: datetime | None = None,
) -> SocialPostCandidate:
    classification, evidence, confidence = _classify(payload, post_text)
    company_context = (
        f" for {author_company}" if author_company else ""
    )
    product = (
        playbook.products_offered[0]
        if playbook and playbook.products_offered
        else "CONNEXTed's event intelligence workflow"
    )
    return SocialPostCandidate(
        organization_id=payload.organization_id,
        discovery_id=discovery_id,
        event_name=payload.event_name,
        platform=platform,
        author_name=author_name,
        author_handle=author_handle,
        author_profile_url=author_profile_url,
        author_company=author_company,
        author_title=author_title,
        post_text=post_text,
        post_url=post_url,
        posted_at=posted_at,
        evidence=evidence,
        classification=classification,
        confidence=confidence,
        relevance_reason=(
            f"Public post appears tied to {payload.event_name} and suggests the author"
            f"{company_context} may be attending, speaking, sponsoring, or open to meetings."
        ),
        suggested_angle=(
            f"Reference the public {platform} post, ask what they want to get from "
            f"{payload.event_name}, and connect it to {product} only after confirming fit."
        ),
        source_query=source_query,
        inferred=True,
    )


def _classify(
    payload: SocialIntentDiscoveryRequest, text: str
) -> tuple[str, list[str], ConfidenceLabel]:
    lower = text.lower()
    evidence = []
    event_name = payload.event_name.lower()
    if event_name and event_name in lower:
        evidence.append(f"Mentions {payload.event_name}.")
    for hashtag in payload.hashtags:
        cleaned = _clean_hashtag(hashtag).lower()
        if cleaned and cleaned in lower:
            evidence.append(f"Uses {cleaned}.")
    for keyword in payload.keywords[:4]:
        if keyword.lower() in lower:
            evidence.append(f"Matches keyword: {keyword}.")

    if any(term in lower for term in ("speaking", "panel", "session", "keynote")):
        classification = "speaker_or_panelist"
        evidence.append("Signals a speaking or session role.")
    elif any(term in lower for term in ("booth", "sponsor", "sponsoring", "exhibiting")):
        classification = "sponsor_or_exhibitor"
        evidence.append("Signals a sponsor, booth, or exhibitor role.")
    elif any(term in lower for term in ("dinner", "meet", "meeting", "coffee", "book time")):
        classification = "meeting_intent"
        evidence.append("Signals openness to meetings.")
    else:
        classification = "likely_attendee"

    if not evidence:
        evidence.append("Matched the event social search input.")
    has_event_evidence = any("Mentions" in item or "Uses" in item for item in evidence)
    has_intent_evidence = classification != "likely_attendee"
    if has_event_evidence and has_intent_evidence:
        confidence = ConfidenceLabel.HIGH
    elif has_event_evidence or has_intent_evidence:
        confidence = ConfidenceLabel.MEDIUM
    else:
        confidence = ConfidenceLabel.LOW
    return classification, evidence, confidence


def _build_x_query(payload: SocialIntentDiscoveryRequest) -> str:
    terms = [_quote(payload.event_name)]
    terms.extend(_clean_hashtag(hashtag) for hashtag in payload.hashtags)
    terms.extend(_quote(keyword) for keyword in payload.keywords[:5] if keyword.strip())
    terms.extend(_quote(name) for name in payload.sponsor_names[:3] if name.strip())
    terms = [term for term in terms if term]
    if not terms:
        terms = [_quote("business conference")]

    intent_terms = [
        "attending",
        "speaking",
        "sponsoring",
        "booth",
        '"see you at"',
        '"meet me"',
        '"book time"',
    ]
    query = f"({' OR '.join(terms)}) ({' OR '.join(intent_terms)}) lang:en -is:retweet"
    handles = [_clean_handle(handle) for handle in payload.organizer_handles[:3]]
    handles = [handle for handle in handles if handle]
    if handles:
        handle_query = " OR ".join(f"from:{handle}" for handle in handles)
        query = f"(({query}) OR ({handle_query} {' OR '.join(terms[:2])}))"
    if len(query) > 480:
        query = f"({' OR '.join(terms[:4])}) lang:en -is:retweet"
    return query[:512]


def _dedupe_candidates(candidates: list[SocialPostCandidate]) -> list[SocialPostCandidate]:
    seen: set[str] = set()
    deduped = []
    for candidate in candidates:
        key = candidate.post_url or f"{candidate.platform}:{candidate.author_handle}:{candidate.post_text}"
        normalized = re.sub(r"\s+", " ", key.lower()).strip()
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(candidate)
    return deduped


def _pasted_post_chunks(value: str) -> list[str]:
    text = value.strip()
    if not text:
        return []
    chunks = [chunk.strip() for chunk in re.split(r"\n\s*\n", text) if chunk.strip()]
    if len(chunks) == 1:
        chunks = [line.strip() for line in text.splitlines() if line.strip()]
    return chunks


def _platform_from_text(value: str) -> str:
    lower = value.lower()
    if "linkedin.com" in lower:
        return "linkedin"
    if "instagram.com" in lower:
        return "instagram"
    if "x.com" in lower or "twitter.com" in lower:
        return "x"
    return "manual_import"


def _handle_from_text(value: str) -> str | None:
    match = re.search(r"(?<!\w)@([A-Za-z0-9_]{2,30})", value)
    return f"@{match.group(1)}" if match else None


def _url_from_text(value: str) -> str | None:
    match = re.search(r"https?://[^\s)]+", value)
    return match.group(0).rstrip(".,") if match else None


def _profile_url(platform: str, handle: str | None) -> str | None:
    if not handle:
        return None
    base = _PROFILE_URLS.get(platform)
    return f"{base}{handle.lstrip('@')}" if base else None


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _x_time_param(value: Any, *, end: bool) -> str:
    day_time = time(23, 59, 59) if end else time.min
    return datetime.combine(value, day_time, UTC).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )


def _quote(value: str | None) -> str:
    cleaned = re.sub(r"\s+", " ", str(value or "")).strip()
    if not cleaned:
        return ""
    if " " in cleaned:
        return f'"{cleaned[:80]}"'
    return cleaned[:80]


def _clean_hashtag(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "", value.strip().lstrip("#"))
    return f"#{cleaned}" if cleaned else ""


def _clean_handle(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "", value.strip().lstrip("@"))


def _event_hashtag(event: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", event)
    return f"#{cleaned}" if cleaned else "#Event"


def _company_from_profile(description: str | None) -> str | None:
    if not description:
        return None
    match = re.search(r"(?:at|@)\s+([A-Z][A-Za-z0-9&.\- ]{2,40})", description)
    return match.group(1).strip() if match else None
