from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.api.dependencies import get_request_settings, get_store
from app.config import Settings
from app.providers.social import discover_social_intent
from app.schemas import (
    CaptureCreate,
    CaptureRead,
    CaptureSource,
    SocialCandidateConvertRequest,
    SocialIntentDiscoveryRead,
    SocialIntentDiscoveryRequest,
    SocialPostCandidate,
)
from app.store import AppStore
from app.workflow.runner import run_capture_workflow

router = APIRouter()


@router.post("/discover", response_model=SocialIntentDiscoveryRead)
async def discover_social_posts(
    payload: SocialIntentDiscoveryRequest,
    store: AppStore = Depends(get_store),
    settings: Settings = Depends(get_request_settings),
) -> SocialIntentDiscoveryRead:
    playbooks = await store.list_playbooks()
    discovery = await discover_social_intent(payload, settings, playbooks[0] if playbooks else None)
    return await store.save_social_discovery(discovery)


@router.get("/candidates", response_model=list[SocialPostCandidate])
async def list_social_candidates(
    event_name: str | None = Query(default=None),
    store: AppStore = Depends(get_store),
) -> list[SocialPostCandidate]:
    return await store.list_social_candidates(event_name=event_name)


@router.post("/candidates/{candidate_id}/convert", response_model=CaptureRead)
async def convert_social_candidate(
    candidate_id: str,
    payload: SocialCandidateConvertRequest,
    background_tasks: BackgroundTasks,
    store: AppStore = Depends(get_store),
) -> CaptureRead:
    candidate = await store.get_social_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Social candidate not found")
    if candidate.converted_capture_id:
        capture = await store.get_capture(candidate.converted_capture_id)
        if capture:
            return capture

    source_url = f"\nSource: {candidate.post_url}" if candidate.post_url else ""
    raw_text = (
        f"Public {candidate.platform} post for {candidate.event_name}:\n"
        f"{candidate.post_text}{source_url}"
    )
    notes = payload.notes or (
        f"{candidate.relevance_reason} Suggested angle: {candidate.suggested_angle}"
    )
    capture = await store.create_capture(
        CaptureCreate(
            organization_id=candidate.organization_id,
            rep_id=payload.rep_id,
            source=CaptureSource.SOCIAL_INTENT,
            raw_text=raw_text,
            prospect_name=candidate.author_name or candidate.author_handle,
            company_name=candidate.author_company,
            event_name=candidate.event_name,
            notes=notes,
            external_message_id=(
                f"social:{candidate.platform}:{candidate.post_url or candidate.id}"
            ),
        )
    )
    await store.mark_social_candidate_converted(candidate.id, capture.id)
    if not capture.was_deduplicated:
        background_tasks.add_task(run_capture_workflow, store, capture.id)
    return capture
