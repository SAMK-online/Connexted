from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.api.dependencies import get_store
from app.providers.event_site import deep_dive_event_site
from app.providers.events import discover_industry_events
from app.schemas import (
    CaptureCreate,
    CaptureRead,
    CaptureSource,
    EventDiscoveryRead,
    EventDiscoveryRequest,
    EventSiteDeepDiveRead,
    EventSiteDeepDiveRequest,
    EventSiteVisitor,
    EventSiteVisitorConvertRequest,
    IndustryEventRead,
)
from app.store import AppStore
from app.workflow.runner import run_capture_workflow

router = APIRouter()


@router.post("/discover", response_model=EventDiscoveryRead)
async def discover_events(
    payload: EventDiscoveryRequest,
    store: AppStore = Depends(get_store),
) -> EventDiscoveryRead:
    playbooks = await store.list_playbooks()
    discovery = await discover_industry_events(payload, playbooks[0] if playbooks else None)
    return await store.save_event_discovery(discovery)


@router.get("", response_model=list[IndustryEventRead])
async def list_events(store: AppStore = Depends(get_store)) -> list[IndustryEventRead]:
    return await store.list_events()


@router.post("/deep-dive", response_model=EventSiteDeepDiveRead)
async def deep_dive_event_site_data(
    payload: EventSiteDeepDiveRequest,
    store: AppStore = Depends(get_store),
) -> EventSiteDeepDiveRead:
    playbooks = await store.list_playbooks()
    deep_dive = await deep_dive_event_site(payload, playbooks[0] if playbooks else None)
    return await store.save_event_site_deep_dive(deep_dive)


@router.get("/site-visitors", response_model=list[EventSiteVisitor])
async def list_event_site_visitors(
    event_name: str | None = Query(default=None),
    store: AppStore = Depends(get_store),
) -> list[EventSiteVisitor]:
    return await store.list_event_site_visitors(event_name=event_name)


@router.post("/site-visitors/{visitor_id}/convert", response_model=CaptureRead)
async def convert_event_site_visitor(
    visitor_id: str,
    payload: EventSiteVisitorConvertRequest,
    background_tasks: BackgroundTasks,
    store: AppStore = Depends(get_store),
) -> CaptureRead:
    visitor = await store.get_event_site_visitor(visitor_id)
    if not visitor:
        raise HTTPException(status_code=404, detail="Event site visitor not found")
    if visitor.converted_capture_id:
        capture = await store.get_capture(visitor.converted_capture_id)
        if capture:
            return capture

    source_url = f"\nSource: {visitor.source_url}" if visitor.source_url else ""
    evidence = "\n".join(f"- {item}" for item in visitor.evidence)
    raw_text = (
        f"Confirmed public event-site listing for {visitor.event_name}:\n"
        f"{visitor.name}"
        f"{f' - {visitor.title}' if visitor.title else ''}"
        f"{f', {visitor.company}' if visitor.company else ''}\n"
        f"Role: {visitor.visitor_role}\n"
        f"Evidence:\n{evidence}{source_url}"
    )
    notes = payload.notes or (
        f"{visitor.relevance_reason} Suggested angle: {visitor.suggested_angle}"
    )
    capture = await store.create_capture(
        CaptureCreate(
            organization_id=visitor.organization_id,
            rep_id=payload.rep_id,
            source=CaptureSource.EVENT_SITE,
            raw_text=raw_text,
            prospect_name=visitor.name,
            company_name=visitor.company,
            event_name=visitor.event_name,
            notes=notes,
            external_message_id=f"event_site:{visitor.source_url or visitor.id}:{visitor.name}",
        )
    )
    await store.mark_event_site_visitor_converted(visitor.id, capture.id)
    if not capture.was_deduplicated:
        background_tasks.add_task(run_capture_workflow, store, capture.id)
    return capture


@router.get("/{event_id}", response_model=IndustryEventRead)
async def get_event(event_id: str, store: AppStore = Depends(get_store)) -> IndustryEventRead:
    event = await store.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
