from app.schemas import CaptureRead, Company, ConfidenceLabel, SourceEvidence


async def enrich_company(capture: CaptureRead) -> tuple[Company, list[SourceEvidence]]:
    company_name = capture.company_name or _company_from_text(capture.raw_text) or "Unknown company"
    source = SourceEvidence(
        source_type="internal_or_public_placeholder",
        title=f"{company_name} initial enrichment",
        url=None,
        snippet=(
            "Placeholder enrichment generated from capture context. "
            "Production provider should combine internal memory, Tavily, and source extraction."
        ),
        confidence=ConfidenceLabel.LOW,
    )
    company = Company(
        name=company_name,
        confidence=ConfidenceLabel.LOW,
        confidence_reasons=["No real enrichment provider configured in local mock mode."],
    )
    return company, [source]


def _company_from_text(text: str) -> str | None:
    markers = ["company:", "org:", "organization:"]
    lowered = text.lower()
    for marker in markers:
        index = lowered.find(marker)
        if index >= 0:
            value = text[index + len(marker) :].strip().splitlines()[0].strip()
            return value or None
    return None

