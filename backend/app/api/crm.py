from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.api.dependencies import get_request_settings, get_store
from app.config import Settings
from app.providers import hubspot
from app.schemas import CrmConnectionStatus, CrmSyncRequest, CrmSyncResult, ReportRead
from app.store import AppStore

router = APIRouter()


@router.get("/hubspot/install")
async def hubspot_install(
    organization_id: str = Query(..., description="Organization to connect HubSpot for"),
    settings: Settings = Depends(get_request_settings),
) -> RedirectResponse:
    if not hubspot.is_configured(settings):
        raise HTTPException(status_code=400, detail="HubSpot is not configured on the server.")
    # State carries the organization so the callback knows which connection to store.
    url = hubspot.build_authorize_url(settings, state=organization_id)
    return RedirectResponse(url)


@router.get("/hubspot/callback")
async def hubspot_callback(
    state: str = Query(...),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
    settings: Settings = Depends(get_request_settings),
    store: AppStore = Depends(get_store),
) -> RedirectResponse:
    frontend = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
    if error or not code:
        return RedirectResponse(f"{frontend}/app/settings?hubspot=error")
    try:
        tokens = await hubspot.exchange_code(settings, code)
        account_id = await hubspot.get_account_id(tokens["access_token"])
        encrypted = hubspot.encrypt_tokens(settings, tokens)
        await store.save_crm_connection(
            organization_id=state,
            external_account_id=account_id,
            encrypted_token_ref=encrypted,
        )
    except hubspot.HubSpotError:
        return RedirectResponse(f"{frontend}/app/settings?hubspot=error")
    return RedirectResponse(f"{frontend}/app/settings?hubspot=connected")


@router.get("/hubspot/status", response_model=CrmConnectionStatus)
async def hubspot_status(
    organization_id: str = Query(...),
    settings: Settings = Depends(get_request_settings),
    store: AppStore = Depends(get_store),
) -> CrmConnectionStatus:
    connection = await store.get_crm_connection(organization_id)
    return CrmConnectionStatus(
        configured=hubspot.is_configured(settings),
        connected=bool(connection),
        external_account_id=connection["external_account_id"] if connection else None,
    )


@router.post("/hubspot/sync", response_model=CrmSyncResult)
async def sync_hubspot(
    payload: CrmSyncRequest,
    settings: Settings = Depends(get_request_settings),
    store: AppStore = Depends(get_store),
) -> CrmSyncResult:
    # Confirm human approval BEFORE writing anything to HubSpot, so an unapproved
    # request can never create orphan CRM records.
    if not await store.has_crm_sync_approval(payload.capture_id):
        raise HTTPException(status_code=400, detail="CRM sync requires explicit approval")
    external_ids = await _real_hubspot_sync(payload, settings, store)
    # external_ids is None when HubSpot isn't configured/connected -> store falls back to mock.
    result = await store.create_crm_sync(payload, external_ids=external_ids)
    if not result:
        raise HTTPException(status_code=400, detail="CRM sync requires explicit approval")
    return result


@router.get("/jobs/{job_id}", response_model=CrmSyncResult)
async def get_crm_job(job_id: str, store: AppStore = Depends(get_store)) -> CrmSyncResult:
    result = await store.get_crm_sync(job_id)
    if not result:
        raise HTTPException(status_code=404, detail="CRM job not found")
    return result


async def _real_hubspot_sync(
    payload: CrmSyncRequest, settings: Settings, store: AppStore
) -> dict | None:
    """Push the report to HubSpot when configured + connected, else return None (mock)."""
    if not hubspot.is_configured(settings):
        return None
    organization_id = await store.get_capture_organization_id(payload.capture_id)
    if not organization_id:
        return None
    connection = await store.get_crm_connection(organization_id)
    if not connection or not connection.get("encrypted_token_ref"):
        return None
    report = await store.get_report_by_capture(payload.capture_id)
    if not report:
        return None

    try:
        access_token, new_blob = await hubspot.ensure_access_token(
            settings, connection["encrypted_token_ref"]
        )
        if new_blob:
            await store.update_crm_connection_tokens(connection["id"], new_blob)
        contact, company, task = _hubspot_payloads(report)
        return await hubspot.sync_report(
            access_token,
            contact=contact,
            company=company,
            task=task,
            portal_id=connection.get("external_account_id"),
        )
    except hubspot.HubSpotError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _hubspot_payloads(report: ReportRead) -> tuple[dict, dict, dict]:
    """Map a report into HubSpot contact/company/task property dicts."""
    contact_props: dict[str, str] = {}
    if report.contact.name:
        first, _, last = report.contact.name.partition(" ")
        contact_props["firstname"] = first
        if last:
            contact_props["lastname"] = last
    if report.contact.email:
        contact_props["email"] = report.contact.email
    if report.contact.phone:
        contact_props["phone"] = report.contact.phone
    if report.contact.title:
        contact_props["jobtitle"] = report.contact.title
    if report.company.name:
        contact_props["company"] = report.company.name

    company_props: dict[str, str] = {}
    if report.company.name:
        company_props["name"] = report.company.name
    if report.company.website:
        company_props["domain"] = report.company.website
    if report.company.industry:
        company_props["industry"] = report.company.industry

    due = datetime.now(UTC) + timedelta(days=1)
    task_props = {
        "hs_task_subject": f"Follow up with {report.contact.name or 'new contact'}",
        "hs_task_body": report.strategy.next_best_action or report.strategy.recommended_angle,
        "hs_task_status": "NOT_STARTED",
        "hs_task_priority": "MEDIUM",
        "hs_timestamp": str(int(due.timestamp() * 1000)),
    }
    return contact_props, company_props, task_props
