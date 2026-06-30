from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request

from app.api.dependencies import get_request_settings, get_store
from app.config import Settings
from app.providers.twilio import validate_twilio_signature
from app.schemas import CaptureCreate, CaptureSource
from app.store import AppStore
from app.workflow.runner import run_capture_workflow

router = APIRouter()


@router.post("/twilio/whatsapp")
async def twilio_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    From: str = Form(default=""),
    Body: str = Form(default=""),
    MessageSid: str = Form(default=""),
    NumMedia: int = Form(default=0),
    MediaUrl0: str | None = Form(default=None),
    MediaContentType0: str | None = Form(default=None),
    store: AppStore = Depends(get_store),
    settings: Settings = Depends(get_request_settings),
) -> dict[str, str]:
    form = await request.form()
    if not settings.mock_providers:
        signature = request.headers.get("X-Twilio-Signature", "")
        if not validate_twilio_signature(
            url=str(request.url),
            params={key: str(value) for key, value in form.items()},
            signature=signature,
            auth_token=settings.twilio_auth_token,
        ):
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    media_urls = [MediaUrl0] if NumMedia and MediaUrl0 else []
    content_types = [MediaContentType0] if NumMedia and MediaContentType0 else []
    capture = await store.create_capture(
        CaptureCreate(
            organization_id="demo-org",
            rep_id=From or "demo-rep",
            source=CaptureSource.WHATSAPP,
            raw_text=Body,
            external_message_id=MessageSid,
            media_urls=media_urls,
            media_content_types=content_types,
        )
    )

    if capture.was_deduplicated:
        return {"status": "duplicate", "capture_id": capture.id}

    background_tasks.add_task(run_capture_workflow, store, capture.id)
    return {"status": "queued", "capture_id": capture.id}
