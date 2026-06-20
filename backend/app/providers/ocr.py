import re

from app.schemas import CaptureRead, ConfidenceLabel, Contact


async def extract_contact(capture: CaptureRead) -> Contact:
    """Mockable OCR/text parser.

    Real provider integration should call Google Vision first and Tesseract as fallback.
    """

    text = "\n".join(
        item
        for item in [capture.prospect_name or "", capture.raw_text or "", capture.notes or ""]
        if item
    )
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", text)

    name = capture.prospect_name or _first_nonempty_line(text)
    return Contact(
        name=name,
        email=email_match.group(0) if email_match else None,
        phone=phone_match.group(0).strip() if phone_match else None,
        confidence=ConfidenceLabel.MEDIUM,
        confidence_reasons=["Parsed from submitted text and placeholder OCR pipeline."],
    )


def _first_nonempty_line(text: str) -> str | None:
    for line in text.splitlines():
        cleaned = line.strip()
        if cleaned and "@" not in cleaned:
            return cleaned
    return None

