from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.api.dependencies import get_store
from app.schemas import CaptureCreate, CaptureRead
from app.store import AppStore
from app.workflow.runner import run_capture_workflow

router = APIRouter()


@router.get("", response_model=list[CaptureRead])
async def list_captures(store: AppStore = Depends(get_store)) -> list[CaptureRead]:
    return await store.list_captures()


@router.post("", response_model=CaptureRead)
async def create_capture(
    payload: CaptureCreate,
    background_tasks: BackgroundTasks,
    store: AppStore = Depends(get_store),
) -> CaptureRead:
    capture = await store.create_capture(payload)
    if not capture.was_deduplicated:
        background_tasks.add_task(run_capture_workflow, store, capture.id)
    return capture


@router.get("/{capture_id}", response_model=CaptureRead)
async def get_capture(capture_id: str, store: AppStore = Depends(get_store)) -> CaptureRead:
    capture = await store.get_capture(capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    return capture


@router.post("/{capture_id}/retry", response_model=CaptureRead)
async def retry_capture(
    capture_id: str,
    background_tasks: BackgroundTasks,
    store: AppStore = Depends(get_store),
) -> CaptureRead:
    capture = await store.get_capture(capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    await store.mark_capture_queued(capture_id)
    background_tasks.add_task(run_capture_workflow, store, capture_id)
    return await store.get_capture(capture_id)
