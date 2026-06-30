from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.schemas import DraftRegenerateRequest, OutreachDraftRead, OutreachDraftUpdate
from app.store import AppStore
from app.workflow.runner import regenerate_draft

router = APIRouter()


@router.patch("/{draft_id}", response_model=OutreachDraftRead)
async def update_draft(
    draft_id: str,
    payload: OutreachDraftUpdate,
    store: AppStore = Depends(get_store),
) -> OutreachDraftRead:
    draft = await store.update_draft(draft_id, payload)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.post("/{draft_id}/regenerate", response_model=OutreachDraftRead)
async def regenerate(
    draft_id: str,
    payload: DraftRegenerateRequest,
    store: AppStore = Depends(get_store),
) -> OutreachDraftRead:
    draft = await regenerate_draft(store, draft_id, payload)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft
