from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.providers.events import discover_industry_events
from app.schemas import EventDiscoveryRead, EventDiscoveryRequest, IndustryEventRead
from app.store import AppStore

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


@router.get("/{event_id}", response_model=IndustryEventRead)
async def get_event(event_id: str, store: AppStore = Depends(get_store)) -> IndustryEventRead:
    event = await store.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
