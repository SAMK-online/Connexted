from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.schemas import AgentRunRead, ReportRead
from app.store import AppStore

router = APIRouter()


@router.get("/{capture_id}", response_model=ReportRead)
async def get_report(capture_id: str, store: AppStore = Depends(get_store)) -> ReportRead:
    report = await store.get_report_by_capture(capture_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{capture_id}/agent-run", response_model=AgentRunRead)
async def get_agent_run(capture_id: str, store: AppStore = Depends(get_store)) -> AgentRunRead:
    run = await store.get_agent_run_by_capture(capture_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run
