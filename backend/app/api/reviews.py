from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.schemas import ReviewDecisionCreate, ReviewDecisionRead
from app.store import AppStore

router = APIRouter()


@router.get("/{capture_id}", response_model=list[ReviewDecisionRead])
async def list_reviews(
    capture_id: str,
    store: AppStore = Depends(get_store),
) -> list[ReviewDecisionRead]:
    return await store.list_reviews(capture_id)


@router.post("", response_model=ReviewDecisionRead)
async def create_review(
    payload: ReviewDecisionCreate,
    store: AppStore = Depends(get_store),
) -> ReviewDecisionRead:
    decision = await store.create_review(payload)
    if not decision:
        raise HTTPException(status_code=404, detail="Review target not found")
    return decision
