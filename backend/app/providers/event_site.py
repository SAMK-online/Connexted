from __future__ import annotations

import re
from urllib.parse import urlparse

from app.schemas import (
    ConfidenceLabel,
    EventSiteDeepDiveRead,
    EventSiteDeepDiveRequest,
    EventSiteVisitor,
    Playbook,
    new_id,
)

ROLE_KEYWORDS = {
    "speaker": ("speaker", "speakers", "keynote", "panelist", "panelists", "session"),
    "sponsor": ("sponsor", "sponsors", "partner", "partners"),
    "exhibitor": ("exhibitor", "exhibitors", "booth"),
    "organizer": ("organizer", "organizers", "host", "hosts"),
    "attendee": ("attendee", "attendees", "delegate", "delegates", "visitor", "visitors"),
}

COMMON_NON_NAMES = {
    "agenda",
    "apply",
    "attend",
    "become a sponsor",
    "book a meeting",
    "buy tickets",
    "contact",
    "exhibit",
    "learn more",
    "register",
    "registration",
    "schedule",
    "sponsor us",
    "speakers",
    "view profile",
}


async def deep_dive_event_site(
    payload: EventSiteDeepDiveRequest,
    playbook: Playbook | None = None,
) -> EventSiteDeepDiveRead:
    """Extract public event-site visitors from user-provided public page text."""

    deep_dive_id = new_id("evsitedisc")
    warnings: list[str] = []
    if payload.event_url:
        warnings.append("Event URL is stored as source evidence; pasted public site text was analyzed.")
    if not payload.site_text.strip():
        warnings.append("Paste public speaker, sponsor, exhibitor, or attendee text to extract confirmed visitors.")

    visitors = _extract_visitors(payload, deep_dive_id, playbook)
    if not visitors and payload.site_text.strip():
        warnings.append("No confirmed visitors were extracted from the provided event-site text.")

    return EventSiteDeepDiveRead(
        id=deep_dive_id,
        organization_id=payload.organization_id,
        rep_id=payload.rep_id,
        request=payload,
        visitors=visitors[: payload.max_visitors],
        warnings=warnings,
    )


def _extract_visitors(
    payload: EventSiteDeepDiveRequest,
    deep_dive_id: str,
    playbook: Playbook | None,
) -> list[EventSiteVisitor]:
    allowed_roles = {_normalize_role(role) for role in payload.roles}
    allowed_roles.discard("")
    current_role = "attendee"
    visitors: list[EventSiteVisitor] = []
    seen: set[str] = set()

    for line in _clean_lines(payload.site_text):
        heading_role = _role_from_line(line)
        if heading_role:
            current_role = heading_role
            if _is_role_heading(line):
                continue

        role = heading_role or current_role
        if allowed_roles and role not in allowed_roles:
            continue

        parsed = _parse_visitor_line(line, role)
        if not parsed:
            continue

        key = _visitor_key(parsed)
        if key in seen:
            continue
        seen.add(key)

        visitors.append(
            _build_visitor(
                payload=payload,
                deep_dive_id=deep_dive_id,
                role=role,
                parsed=parsed,
                source_line=line,
                playbook=playbook,
            )
        )
        if len(visitors) >= payload.max_visitors:
            break
    return visitors


def _build_visitor(
    *,
    payload: EventSiteDeepDiveRequest,
    deep_dive_id: str,
    role: str,
    parsed: dict[str, str | None],
    source_line: str,
    playbook: Playbook | None,
) -> EventSiteVisitor:
    product = (
        playbook.products_offered[0]
        if playbook and playbook.products_offered
        else "CONNEXTed event intelligence"
    )
    role_label = role.replace("_", " ")
    name = parsed["name"] or parsed["company"] or "Confirmed event participant"
    company = parsed["company"]
    confidence = _confidence_for(parsed, role, bool(payload.event_url))
    source_label = _source_label(payload.event_url)
    evidence = [
        f"Public event site line: {source_line[:220]}",
        f"Classified as {role_label}.",
    ]
    if payload.event_url:
        evidence.append(f"Source URL supplied: {payload.event_url}")

    return EventSiteVisitor(
        organization_id=payload.organization_id,
        deep_dive_id=deep_dive_id,
        event_name=payload.event_name,
        name=name,
        title=parsed["title"],
        company=company,
        visitor_role=role,
        source_url=payload.event_url,
        source_label=source_label,
        evidence=evidence,
        confidence=confidence,
        relevance_reason=(
            f"{name} is publicly listed as a {role_label} for {payload.event_name}."
        ),
        suggested_angle=(
            f"Reference the {role_label} listing for {payload.event_name}; ask what "
            f"{company or name} wants to accomplish at the event before positioning {product}."
        ),
        inferred=False,
    )


def _parse_visitor_line(line: str, role: str) -> dict[str, str | None] | None:
    if _is_noise(line):
        return None

    parts = [
        part.strip(" ,")
        for part in re.split(r"\s+(?:-|\u2013|\u2014|\|)\s+|\t+", line, maxsplit=2)
        if part.strip(" ,")
    ]
    if len(parts) >= 3 and _looks_like_person(parts[0]):
        return {"name": parts[0], "title": parts[1], "company": parts[2]}
    if len(parts) == 2 and _looks_like_person(parts[0]):
        title, company = _split_title_company(parts[1])
        return {"name": parts[0], "title": title, "company": company}

    comma_parts = [part.strip() for part in line.split(",") if part.strip()]
    if len(comma_parts) >= 3 and _looks_like_person(comma_parts[0]):
        return {
            "name": comma_parts[0],
            "title": comma_parts[1],
            "company": ", ".join(comma_parts[2:]),
        }
    if len(comma_parts) == 2 and _looks_like_person(comma_parts[0]):
        title, company = _split_title_company(comma_parts[1])
        return {"name": comma_parts[0], "title": title, "company": company}

    if _looks_like_person(line):
        return {"name": line, "title": None, "company": None}

    if role in {"sponsor", "exhibitor", "organizer"} and _looks_like_company(line):
        return {"name": line, "title": None, "company": line}

    return None


def _split_title_company(value: str) -> tuple[str | None, str | None]:
    chunks = [chunk.strip() for chunk in value.split(",") if chunk.strip()]
    if len(chunks) >= 2:
        return chunks[0], ", ".join(chunks[1:])
    if _looks_like_company(value):
        return None, value
    return value, None


def _clean_lines(text: str) -> list[str]:
    lines = []
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line or len(line) > 280:
            continue
        lines.append(line)
    return lines


def _role_from_line(line: str) -> str | None:
    lowered = line.lower()
    for role, keywords in ROLE_KEYWORDS.items():
        if any(re.search(rf"\b{re.escape(keyword)}\b", lowered) for keyword in keywords):
            return role
    return None


def _is_role_heading(line: str) -> bool:
    lowered = line.strip().lower()
    return lowered in {keyword for keywords in ROLE_KEYWORDS.values() for keyword in keywords}


def _normalize_role(role: str) -> str:
    lowered = role.strip().lower().replace(" ", "_")
    for normalized, keywords in ROLE_KEYWORDS.items():
        if lowered == normalized or lowered in keywords:
            return normalized
    return lowered


def _looks_like_person(value: str) -> bool:
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 80:
        return False
    if any(char.isdigit() for char in cleaned) or "@" in cleaned or "http" in cleaned.lower():
        return False
    words = [word.strip(".") for word in re.split(r"\s+", cleaned) if word.strip(".")]
    if len(words) < 2 or len(words) > 5:
        return False
    capitalized = sum(1 for word in words if re.match(r"^[A-Z][A-Za-z'.-]+$", word))
    return capitalized >= min(2, len(words))


def _looks_like_company(value: str) -> bool:
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 100:
        return False
    lowered = cleaned.lower()
    if lowered in COMMON_NON_NAMES or "http" in lowered or "@" in lowered:
        return False
    company_terms = (
        "ai",
        "app",
        "capital",
        "cloud",
        "co",
        "corp",
        "group",
        "inc",
        "labs",
        "llc",
        "partners",
        "systems",
        "tech",
        "ventures",
    )
    has_company_term = any(re.search(rf"\b{term}\b", lowered) for term in company_terms)
    has_title_case = any(word[:1].isupper() for word in cleaned.split())
    return has_company_term or (has_title_case and len(cleaned.split()) <= 5)


def _is_noise(line: str) -> bool:
    lowered = line.strip().lower()
    if lowered in COMMON_NON_NAMES:
        return True
    if len(line.split()) > 18:
        return True
    return lowered.startswith(("copyright", "privacy", "terms", "cookie"))


def _confidence_for(
    parsed: dict[str, str | None], role: str, has_source_url: bool
) -> ConfidenceLabel:
    if parsed.get("title") and parsed.get("company") and has_source_url:
        return ConfidenceLabel.HIGH
    if parsed.get("company") or role in {"speaker", "organizer"}:
        return ConfidenceLabel.MEDIUM
    return ConfidenceLabel.LOW


def _source_label(event_url: str | None) -> str:
    if not event_url:
        return "Pasted event site text"
    host = urlparse(event_url).netloc
    return host or "Event site"


def _visitor_key(parsed: dict[str, str | None]) -> str:
    return "|".join(
        str(parsed.get(field) or "").strip().lower() for field in ("name", "company", "title")
    )
