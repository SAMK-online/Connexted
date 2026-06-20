import base64
import hashlib
import hmac


def validate_twilio_signature(
    url: str,
    params: dict[str, str],
    signature: str,
    auth_token: str | None,
) -> bool:
    if not auth_token or not signature:
        return False

    data = url + "".join(f"{key}{params[key]}" for key in sorted(params))
    digest = hmac.new(auth_token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)

