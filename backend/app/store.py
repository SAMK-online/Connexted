from collections import defaultdict
from datetime import UTC, datetime
from hashlib import sha256

from app.schemas import (
    AgentRunRead,
    CaptureCreate,
    CaptureRead,
    CaptureStatus,
    CrmSyncRequest,
    CrmSyncResult,
    DraftRegenerateRequest,
    EventDiscoveryRead,
    IndustryEventRead,
    OutreachDraftRead,
    OutreachDraftUpdate,
    ReportRead,
    ReviewAction,
    ReviewDecisionCreate,
    ReviewDecisionRead,
)


class InMemoryStore:
    """Local development store.

    Production persistence is defined in `supabase/migrations`; this store keeps the
    initial API runnable before Supabase credentials are configured.
    """

    def __init__(self) -> None:
        self.captures: dict[str, CaptureRead] = {}
        self.dedupe_index: dict[str, str] = {}
        self.reports: dict[str, ReportRead] = {}
        self.agent_runs: dict[str, AgentRunRead] = {}
        self.drafts: dict[str, OutreachDraftRead] = {}
        self.reviews: dict[str, list[ReviewDecisionRead]] = defaultdict(list)
        self.crm_results: dict[str, CrmSyncResult] = {}
        self.event_discoveries: dict[str, EventDiscoveryRead] = {}
        self.events: dict[str, IndustryEventRead] = {}

    def create_capture(self, payload: CaptureCreate) -> CaptureRead:
        dedupe_key = self._capture_dedupe_key(payload)
        if dedupe_key in self.dedupe_index:
            existing = self.captures[self.dedupe_index[dedupe_key]]
            return existing.model_copy(update={"was_deduplicated": True})

        capture = CaptureRead(**payload.model_dump(), dedupe_key=dedupe_key)
        self.captures[capture.id] = capture
        self.dedupe_index[dedupe_key] = capture.id
        return capture

    def list_captures(self) -> list[CaptureRead]:
        return sorted(self.captures.values(), key=lambda item: item.created_at, reverse=True)

    def get_capture(self, capture_id: str) -> CaptureRead | None:
        return self.captures.get(capture_id)

    def mark_capture_queued(self, capture_id: str) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={"status": CaptureStatus.QUEUED, "updated_at": datetime.now(UTC)}
        )

    def mark_capture_running(self, capture_id: str) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={"status": CaptureStatus.RUNNING, "updated_at": datetime.now(UTC)}
        )

    def mark_capture_review_ready(self, capture_id: str, warnings: list[str]) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={
                "status": CaptureStatus.REVIEW_READY,
                "warnings": warnings,
                "updated_at": datetime.now(UTC),
            }
        )

    def save_agent_run(self, run: AgentRunRead) -> AgentRunRead:
        self.agent_runs[run.id] = run
        return run

    def get_agent_run_by_capture(self, capture_id: str) -> AgentRunRead | None:
        for run in self.agent_runs.values():
            if run.capture_id == capture_id:
                return run
        return None

    def save_report(self, report: ReportRead) -> ReportRead:
        self.reports[report.id] = report
        for draft in report.drafts:
            self.drafts[draft.id] = draft
        return report

    def get_report_by_capture(self, capture_id: str) -> ReportRead | None:
        for report in self.reports.values():
            if report.capture_id == capture_id:
                return report
        return None

    def update_draft(
        self, draft_id: str, payload: OutreachDraftUpdate
    ) -> OutreachDraftRead | None:
        draft = self.drafts.get(draft_id)
        if not draft:
            return None
        update = payload.model_dump(exclude_none=True)
        update["version"] = draft.version + 1
        update["updated_at"] = datetime.now(UTC)
        updated = draft.model_copy(update=update)
        self.drafts[draft_id] = updated
        self._replace_report_draft(updated)
        return updated

    def regenerate_draft(
        self, draft_id: str, payload: DraftRegenerateRequest
    ) -> OutreachDraftRead | None:
        draft = self.drafts.get(draft_id)
        if not draft:
            return None
        body = f"{draft.body}\n\nRevision command applied: {payload.command}"
        updated = draft.model_copy(
            update={"body": body, "version": draft.version + 1, "updated_at": datetime.now(UTC)}
        )
        self.drafts[draft_id] = updated
        self._replace_report_draft(updated)
        return updated

    def create_review(self, payload: ReviewDecisionCreate) -> ReviewDecisionRead | None:
        if payload.capture_id not in self.captures:
            return None
        decision = ReviewDecisionRead(**payload.model_dump())
        self.reviews[payload.capture_id].append(decision)
        if payload.target_type == "draft" and payload.target_id in self.drafts:
            draft = self.drafts[payload.target_id]
            status = "approved" if payload.action == ReviewAction.APPROVE else "rejected"
            updated = draft.model_copy(update={"review_status": status, "updated_at": datetime.now(UTC)})
            self.drafts[payload.target_id] = updated
            self._replace_report_draft(updated)
        return decision

    def list_reviews(self, capture_id: str) -> list[ReviewDecisionRead]:
        return self.reviews.get(capture_id, [])

    def create_crm_sync(self, payload: CrmSyncRequest) -> CrmSyncResult | None:
        approvals = self.reviews.get(payload.capture_id, [])
        has_approval = any(decision.action == ReviewAction.APPROVE_CRM_SYNC for decision in approvals)
        if not has_approval:
            return None
        result = CrmSyncResult(
            capture_id=payload.capture_id,
            status="completed",
            hubspot_contact_id="mock-contact",
            hubspot_company_id="mock-company",
            hubspot_task_id="mock-task",
            external_url="https://app.hubspot.com/contacts/mock",
            message="Mock HubSpot contact, company, and follow-up task synced.",
        )
        self.crm_results[result.id] = result
        return result

    def get_crm_sync(self, job_id: str) -> CrmSyncResult | None:
        return self.crm_results.get(job_id)

    def save_event_discovery(self, discovery: EventDiscoveryRead) -> EventDiscoveryRead:
        self.event_discoveries[discovery.id] = discovery
        for event in discovery.events:
            self.events[event.id] = event
        return discovery

    def list_events(self) -> list[IndustryEventRead]:
        return sorted(self.events.values(), key=lambda item: item.created_at, reverse=True)

    def get_event(self, event_id: str) -> IndustryEventRead | None:
        return self.events.get(event_id)

    def _replace_report_draft(self, updated: OutreachDraftRead) -> None:
        for report_id, report in self.reports.items():
            if report.id == updated.report_id:
                self.reports[report_id] = report.model_copy(
                    update={
                        "drafts": [
                            updated if draft.id == updated.id else draft for draft in report.drafts
                        ]
                    }
                )

    @staticmethod
    def _capture_dedupe_key(payload: CaptureCreate) -> str:
        seed = "|".join(
            [
                payload.organization_id,
                payload.external_message_id or "",
                payload.raw_text.strip().lower(),
                ",".join(payload.media_urls),
            ]
        )
        return sha256(seed.encode("utf-8")).hexdigest()
