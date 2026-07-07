from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from app.config import get_settings
from app.providers import prospeo
from app.schemas import CaptureRead, Company, ConfidenceLabel, Contact, SourceEvidence

_URL_RE = re.compile(r"https?://[^\s),;]+", re.IGNORECASE)
_DOMAIN_RE = re.compile(r"\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b", re.IGNORECASE)
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


async def enrich_company(capture: CaptureRead) -> tuple[Company, list[SourceEvidence]]:
    settings = get_settings()
    if settings.mock_providers or not prospeo.is_configured(settings):
        return _placeholder_company(
            capture,
            "No real enrichment provider configured in local/mock mode.",
        )

    lookup_data = _company_lookup_data(capture)
    if not lookup_data:
        return _placeholder_company(capture, "No company lookup datapoints were submitted.")

    try:
        payload = await prospeo.enrich_company(settings, lookup_data)
    except prospeo.ProspeoError as exc:
        reason = (
            "Prospeo could not match the submitted company data."
            if exc.code == "NO_MATCH"
            else f"Prospeo company enrichment did not complete: {exc.code}."
        )
        return _placeholder_company(capture, reason)

    company_payload = payload.get("company") or {}
    if not company_payload:
        return _placeholder_company(capture, "Prospeo returned no company record.")

    return _company_from_prospeo(company_payload), [_company_source(company_payload)]


async def enrich_contact(
    capture: CaptureRead,
    contact: Contact,
    company: Company,
) -> tuple[Contact, Company | None, list[SourceEvidence]]:
    settings = get_settings()
    if settings.mock_providers or not prospeo.is_configured(settings):
        return contact, None, []

    lookup_data = _person_lookup_data(capture, contact, company)
    if not lookup_data:
        return contact, None, []

    try:
        payload = await prospeo.enrich_person(
            settings,
            lookup_data,
            only_verified_email=settings.prospeo_only_verified_email,
            enrich_mobile=settings.prospeo_enrich_mobile,
        )
    except prospeo.ProspeoError as exc:
        if exc.code == "NO_MATCH":
            return contact, None, []
        return (
            contact,
            None,
            [
                SourceEvidence(
                    source_type="prospeo_person_error",
                    title="Prospeo person enrichment unavailable",
                    snippet=f"Prospeo person enrichment did not complete: {exc.code}.",
                    confidence=ConfidenceLabel.LOW,
                )
            ],
        )

    person_payload = payload.get("person") or {}
    company_payload = payload.get("company") or {}
    if not person_payload:
        return contact, None, []

    enriched_contact = _merge_contact(contact, person_payload)
    company_update = _company_from_prospeo(company_payload) if company_payload else None
    return enriched_contact, company_update, [_person_source(person_payload, company_payload)]


def _placeholder_company(
    capture: CaptureRead,
    reason: str,
) -> tuple[Company, list[SourceEvidence]]:
    company_name = capture.company_name or _company_from_text(capture.raw_text) or "Unknown company"
    source = SourceEvidence(
        source_type="internal_or_public_placeholder",
        title=f"{company_name} initial enrichment",
        url=None,
        snippet=(
            "Placeholder enrichment generated from capture context. "
            f"{reason} Production enrichment should combine Prospeo, trusted resources, "
            "and source extraction."
        ),
        confidence=ConfidenceLabel.LOW,
    )
    company = Company(
        name=company_name,
        confidence=ConfidenceLabel.LOW,
        confidence_reasons=[reason],
    )
    return company, [source]


def _company_lookup_data(capture: CaptureRead) -> dict[str, str]:
    text = _capture_text(capture)
    data: dict[str, str] = {}
    if capture.company_name:
        data["company_name"] = capture.company_name
    if website := _website_from_text(text):
        data["company_website"] = website
    if company_linkedin_url := _linkedin_url_from_text(text, company=True):
        data["company_linkedin_url"] = company_linkedin_url
    return data


def _person_lookup_data(
    capture: CaptureRead,
    contact: Contact,
    company: Company,
) -> dict[str, str]:
    text = _capture_text(capture)
    data: dict[str, str] = {}
    if contact.name:
        data["full_name"] = contact.name
        if split_name := _split_name(contact.name):
            data["first_name"], data["last_name"] = split_name
    if contact.email:
        data["email"] = contact.email
    if linkedin_url := (contact.linkedin_url or _linkedin_url_from_text(text, company=False)):
        data["linkedin_url"] = linkedin_url
    if company.name and company.name != "Unknown company":
        data["company_name"] = company.name
    if company.website:
        data["company_website"] = _domain_or_url(company.website)

    has_person_identifier = any(data.get(key) for key in ("email", "linkedin_url", "full_name"))
    has_company_context = any(data.get(key) for key in ("company_name", "company_website"))
    if has_person_identifier and (has_company_context or data.get("email") or data.get("linkedin_url")):
        return data
    return {}


def _company_from_prospeo(payload: dict[str, Any]) -> Company:
    location = payload.get("location") or {}
    headquarters = location.get("raw_address") or _join_present(
        location.get("city"),
        location.get("state"),
        location.get("country"),
        separator=", ",
    )
    website = payload.get("website") or payload.get("domain")
    return Company(
        name=payload.get("name"),
        website=_normalize_website(website) if website else None,
        industry=payload.get("industry"),
        headquarters=headquarters or None,
        confidence=ConfidenceLabel.HIGH,
        confidence_reasons=["Matched by Prospeo company enrichment."],
    )


def _merge_contact(contact: Contact, payload: dict[str, Any]) -> Contact:
    email_payload = payload.get("email") or {}
    mobile_payload = payload.get("mobile") or {}
    email = _usable_revealed_value(email_payload.get("email"))
    phone = _usable_revealed_value(
        mobile_payload.get("mobile_international") or mobile_payload.get("mobile")
    )
    update = {
        "name": payload.get("full_name") or contact.name,
        "title": payload.get("current_job_title") or contact.title,
        "email": email or contact.email,
        "phone": phone or contact.phone,
        "linkedin_url": payload.get("linkedin_url") or contact.linkedin_url,
        "confidence": ConfidenceLabel.HIGH,
        "confidence_reasons": [
            *contact.confidence_reasons,
            "Matched by Prospeo person enrichment.",
        ],
    }
    return contact.model_copy(update=update)


def _company_source(payload: dict[str, Any]) -> SourceEvidence:
    name = payload.get("name") or "Company"
    snippet_parts = [
        payload.get("description_ai") or payload.get("description_seo") or payload.get("description"),
        _join_present("Industry", payload.get("industry"), separator=": "),
        _join_present("Employee range", payload.get("employee_range"), separator=": "),
        _technology_summary(payload.get("technology") or {}),
        _job_postings_summary(payload.get("job_postings") or {}),
        _funding_summary(payload.get("funding") or {}),
    ]
    return SourceEvidence(
        source_type="prospeo_company",
        title=f"{name} Prospeo company enrichment",
        url=payload.get("website") or payload.get("linkedin_url") or payload.get("crunchbase_url"),
        snippet=_compact_snippet(snippet_parts),
        confidence=ConfidenceLabel.HIGH,
    )


def _person_source(
    person_payload: dict[str, Any],
    company_payload: dict[str, Any],
) -> SourceEvidence:
    name = person_payload.get("full_name") or "Prospect"
    email_payload = person_payload.get("email") or {}
    mobile_payload = person_payload.get("mobile") or {}
    location = person_payload.get("location") or {}
    snippet_parts = [
        _join_present("Title", person_payload.get("current_job_title"), separator=": "),
        _join_present("Company", company_payload.get("name"), separator=": "),
        _join_present("Email status", email_payload.get("status"), separator=": "),
        _join_present("Mobile status", mobile_payload.get("status"), separator=": "),
        _join_present(
            "Location",
            _join_present(location.get("city"), location.get("state"), location.get("country")),
            separator=": ",
        ),
    ]
    return SourceEvidence(
        source_type="prospeo_person",
        title=f"{name} Prospeo person enrichment",
        url=person_payload.get("linkedin_url"),
        snippet=_compact_snippet(snippet_parts),
        confidence=ConfidenceLabel.HIGH,
        is_personal_social=bool(person_payload.get("linkedin_url")),
    )


def _company_from_text(text: str) -> str | None:
    markers = ["company:", "org:", "organization:"]
    lowered = text.lower()
    for marker in markers:
        index = lowered.find(marker)
        if index >= 0:
            value = text[index + len(marker) :].strip().splitlines()[0].strip()
            return value or None
    return None


def _capture_text(capture: CaptureRead) -> str:
    return "\n".join(item for item in [capture.raw_text, capture.notes or ""] if item)


def _website_from_text(text: str) -> str | None:
    for url in _URL_RE.findall(text):
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        if "linkedin.com" in host:
            continue
        return _domain_or_url(url)

    without_emails = _EMAIL_RE.sub("", text)
    for domain in _DOMAIN_RE.findall(without_emails):
        normalized = domain.lower().strip(".")
        if "linkedin.com" in normalized:
            continue
        return normalized
    return None


def _linkedin_url_from_text(text: str, *, company: bool) -> str | None:
    for url in _URL_RE.findall(text):
        parsed = urlparse(url)
        path = parsed.path.lower()
        if "linkedin.com" not in parsed.netloc.lower():
            continue
        if company and "/company/" in path:
            return url
        if not company and "/in/" in path:
            return url
    return None


def _split_name(name: str) -> tuple[str, str] | None:
    parts = [part for part in name.strip().split() if part]
    if len(parts) < 2:
        return None
    return parts[0], parts[-1]


def _domain_or_url(value: str) -> str:
    parsed = urlparse(value if value.startswith(("http://", "https://")) else f"https://{value}")
    return parsed.netloc.lower() or value


def _normalize_website(value: str) -> str:
    if value.startswith(("http://", "https://")):
        return value
    return f"https://{value}"


def _usable_revealed_value(value: str | None) -> str | None:
    if not value or "*" in value:
        return None
    return value


def _technology_summary(payload: dict[str, Any]) -> str | None:
    names = payload.get("technology_names") or []
    if not names:
        return None
    return f"Technologies: {', '.join(str(name) for name in names[:8])}."


def _job_postings_summary(payload: dict[str, Any]) -> str | None:
    active_count = payload.get("active_count")
    titles = payload.get("active_titles") or []
    if not active_count and not titles:
        return None
    title_summary = f" including {', '.join(str(title) for title in titles[:5])}" if titles else ""
    return f"Active job postings: {active_count or len(titles)}{title_summary}."


def _funding_summary(payload: dict[str, Any]) -> str | None:
    if not payload:
        return None
    total = payload.get("total_funding_printed")
    latest_stage = payload.get("latest_funding_stage")
    latest_date = payload.get("latest_funding_date")
    parts = [_join_present("Total funding", total, separator=": ")]
    latest = _join_present(latest_stage, latest_date, separator=" on ")
    if latest:
        parts.append(f"Latest funding: {latest}.")
    return " ".join(part for part in parts if part) or None


def _join_present(*values: Any, separator: str = ", ") -> str:
    return separator.join(str(value) for value in values if value not in (None, ""))


def _compact_snippet(parts: list[str | None], max_length: int = 1200) -> str:
    snippet = " ".join(part.strip() for part in parts if part and part.strip())
    if not snippet:
        return "Prospeo returned a matched enrichment record."
    if len(snippet) <= max_length:
        return snippet
    return f"{snippet[: max_length - 1].rstrip()}..."
