from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.schemas import CrmSyncRequest, CrmSyncResult
from app.store import InMemoryStore

router = APIRouter()


@router.post("/hubspot/sync", response_model=CrmSyncResult)
async def sync_hubspot(
    payload: CrmSyncRequest,
    store: InMemoryStore = Depends(get_store),
) -> CrmSyncResult:
    result = store.create_crm_sync(payload)
    if not result:
        raise HTTPException(status_code=400, detail="CRM sync requires explicit approval")
    return result


@router.get("/jobs/{job_id}", response_model=CrmSyncResult)
async def get_crm_job(job_id: str, store: InMemoryStore = Depends(get_store)) -> CrmSyncResult:
    result = store.get_crm_sync(job_id)
    if not result:
        raise HTTPException(status_code=404, detail="CRM job not found")
    return result

