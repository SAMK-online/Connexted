from __future__ import annotations

import json
import ssl
from collections import defaultdict
from datetime import UTC, datetime
from hashlib import sha256
from typing import Any, Protocol
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.config import Settings
from app.schemas import (
    AgentRunRead,
    AgentStep,
    CaptureCreate,
    CaptureRead,
    CaptureStatus,
    CrmConnectionRead,
    CrmSyncRequest,
    CrmSyncResult,
    DraftRegenerateRequest,
    EventAttendee,
    EventDiscoveryRead,
    EventOutreachDraft,
    EventSiteDeepDiveRead,
    EventSiteVisitor,
    EventSource,
    IndustryEventRead,
    OutreachDraftRead,
    OutreachDraftUpdate,
    Playbook,
    PlaybookUpsert,
    ReportRead,
    ReviewAction,
    ReviewDecisionCreate,
    ReviewDecisionRead,
    Signal,
    SocialIntentDiscoveryRead,
    SocialPostCandidate,
    SourceEvidence,
    StyleProfile,
    StyleProfileUpsert,
    new_id,
)


DEFAULT_PLAYBOOK_DATA = {
    "name": "Default GTM Playbook",
    "icp_segments": ["B2B software", "partnership-led growth"],
    "target_personas": ["VP Sales", "Head of Partnerships", "RevOps Director"],
    "disqualifiers": ["student project", "non-business use"],
    "negative_signals": ["No B2B motion", "No sales or partnerships team"],
    "value_props": ["Increase speed from event conversation to reviewed outreach"],
    "products_offered": [
        "WhatsApp-first lead capture",
        "Prospect and account enrichment",
        "Reviewed outreach and CRM sync",
    ],
    "target_sectors": ["B2B SaaS", "partnership-led growth teams", "event-led GTM teams"],
    "sector_positioning": [
        "B2B SaaS -> convert event conversations into researched, approved follow-up.",
        "Partnership teams -> preserve relationship context before HubSpot handoff.",
    ],
    "priority_signals": ["partnership interest", "event sponsorship", "hiring or team growth"],
    "trusted_sources": ["Company website", "Press releases", "Event speaker pages"],
    "research_resources": [],
    "research_instructions": "",
    "competitors": [],
    "proof_points": [],
    "personalization_rules": ["Reference the event or conversation before pitching."],
    "research_freshness_days": 90,
}

DEFAULT_STYLE_PROFILE_DATA = {
    "name": "Default concise executive",
    "tone": "direct, useful, low-hype",
    "banned_phrases": ["just checking in", "hope you're doing well"],
    "cta_style": "specific next step",
}


class AppStore(Protocol):
    async def close(self) -> None: ...

    async def create_capture(self, payload: CaptureCreate) -> CaptureRead: ...

    async def list_captures(self) -> list[CaptureRead]: ...

    async def get_capture(self, capture_id: str) -> CaptureRead | None: ...

    async def mark_capture_queued(self, capture_id: str) -> None: ...

    async def mark_capture_running(self, capture_id: str) -> None: ...

    async def mark_capture_review_ready(self, capture_id: str, warnings: list[str]) -> None: ...

    async def mark_capture_failed(self, capture_id: str, warnings: list[str]) -> None: ...

    async def save_agent_run(self, run: AgentRunRead) -> AgentRunRead: ...

    async def get_agent_run_by_capture(self, capture_id: str) -> AgentRunRead | None: ...

    async def save_report(self, report: ReportRead) -> ReportRead: ...

    async def get_report_by_capture(self, capture_id: str) -> ReportRead | None: ...

    async def update_draft(
        self, draft_id: str, payload: OutreachDraftUpdate
    ) -> OutreachDraftRead | None: ...

    async def regenerate_draft(
        self, draft_id: str, payload: DraftRegenerateRequest
    ) -> OutreachDraftRead | None: ...

    async def create_review(self, payload: ReviewDecisionCreate) -> ReviewDecisionRead | None: ...

    async def list_reviews(self, capture_id: str) -> list[ReviewDecisionRead]: ...

    async def has_crm_sync_approval(self, capture_id: str) -> bool: ...

    async def create_crm_sync(
        self, payload: CrmSyncRequest, external_ids: dict | None = None
    ) -> CrmSyncResult | None: ...

    async def get_crm_sync(self, job_id: str) -> CrmSyncResult | None: ...

    async def get_capture_organization_id(self, capture_id: str) -> str | None: ...

    async def get_crm_connection(self, organization_id: str) -> dict | None: ...

    async def save_crm_connection(
        self, organization_id: str, external_account_id: str | None, encrypted_token_ref: str
    ) -> CrmConnectionRead: ...

    async def update_crm_connection_tokens(
        self, connection_id: str, encrypted_token_ref: str
    ) -> None: ...

    async def save_event_discovery(self, discovery: EventDiscoveryRead) -> EventDiscoveryRead: ...

    async def list_events(self) -> list[IndustryEventRead]: ...

    async def get_event(self, event_id: str) -> IndustryEventRead | None: ...

    async def save_event_site_deep_dive(
        self, deep_dive: EventSiteDeepDiveRead
    ) -> EventSiteDeepDiveRead: ...

    async def list_event_site_visitors(
        self, event_name: str | None = None
    ) -> list[EventSiteVisitor]: ...

    async def get_event_site_visitor(self, visitor_id: str) -> EventSiteVisitor | None: ...

    async def mark_event_site_visitor_converted(
        self, visitor_id: str, capture_id: str
    ) -> None: ...

    async def save_social_discovery(
        self, discovery: SocialIntentDiscoveryRead
    ) -> SocialIntentDiscoveryRead: ...

    async def list_social_candidates(
        self, event_name: str | None = None
    ) -> list[SocialPostCandidate]: ...

    async def get_social_candidate(self, candidate_id: str) -> SocialPostCandidate | None: ...

    async def mark_social_candidate_converted(
        self, candidate_id: str, capture_id: str
    ) -> None: ...

    async def list_playbooks(self) -> list[Playbook]: ...

    async def update_playbook(
        self, playbook_id: str, payload: PlaybookUpsert
    ) -> Playbook | None: ...

    async def list_style_profiles(self) -> list[StyleProfile]: ...

    async def update_style_profile(
        self, profile_id: str, payload: StyleProfileUpsert
    ) -> StyleProfile | None: ...


def create_store(settings: Settings) -> AppStore:
    if settings.persistence_backend == "postgres":
        if not settings.database_url:
            raise RuntimeError("PERSISTENCE_BACKEND=postgres requires DATABASE_URL")
        return PostgresStore(settings.database_url)
    return InMemoryStore()


class InMemoryStore:
    """Local development store.

    Production persistence is defined in `supabase/migrations`; this store keeps the
    API runnable before Supabase credentials are configured.
    """

    def __init__(self) -> None:
        self.captures: dict[str, CaptureRead] = {}
        self.dedupe_index: dict[str, str] = {}
        self.reports: dict[str, ReportRead] = {}
        self.agent_runs: dict[str, AgentRunRead] = {}
        self.drafts: dict[str, OutreachDraftRead] = {}
        self.reviews: dict[str, list[ReviewDecisionRead]] = defaultdict(list)
        self.crm_results: dict[str, CrmSyncResult] = {}
        self.crm_connections: dict[str, dict] = {}
        self.event_discoveries: dict[str, EventDiscoveryRead] = {}
        self.events: dict[str, IndustryEventRead] = {}
        self.event_site_deep_dives: dict[str, EventSiteDeepDiveRead] = {}
        self.event_site_visitors: dict[str, EventSiteVisitor] = {}
        self.social_discoveries: dict[str, SocialIntentDiscoveryRead] = {}
        self.social_candidates: dict[str, SocialPostCandidate] = {}
        self.playbooks: dict[str, Playbook] = {
            "default-playbook": Playbook(id="default-playbook", **DEFAULT_PLAYBOOK_DATA)
        }
        self.style_profiles: dict[str, StyleProfile] = {
            "default-style": StyleProfile(id="default-style", **DEFAULT_STYLE_PROFILE_DATA)
        }

    async def close(self) -> None:
        return None

    async def create_capture(self, payload: CaptureCreate) -> CaptureRead:
        dedupe_key = _capture_dedupe_key(payload)
        if dedupe_key in self.dedupe_index:
            existing = self.captures[self.dedupe_index[dedupe_key]]
            return existing.model_copy(update={"was_deduplicated": True})

        capture = CaptureRead(**payload.model_dump(), dedupe_key=dedupe_key)
        self.captures[capture.id] = capture
        self.dedupe_index[dedupe_key] = capture.id
        return capture

    async def list_captures(self) -> list[CaptureRead]:
        return sorted(self.captures.values(), key=lambda item: item.created_at, reverse=True)

    async def get_capture(self, capture_id: str) -> CaptureRead | None:
        return self.captures.get(capture_id)

    async def mark_capture_queued(self, capture_id: str) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={"status": CaptureStatus.QUEUED, "updated_at": datetime.now(UTC)}
        )

    async def mark_capture_running(self, capture_id: str) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={"status": CaptureStatus.RUNNING, "updated_at": datetime.now(UTC)}
        )

    async def mark_capture_review_ready(self, capture_id: str, warnings: list[str]) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={
                "status": CaptureStatus.REVIEW_READY,
                "warnings": warnings,
                "updated_at": datetime.now(UTC),
            }
        )

    async def mark_capture_failed(self, capture_id: str, warnings: list[str]) -> None:
        capture = self.captures[capture_id]
        self.captures[capture_id] = capture.model_copy(
            update={
                "status": CaptureStatus.FAILED,
                "warnings": warnings,
                "updated_at": datetime.now(UTC),
            }
        )

    async def save_agent_run(self, run: AgentRunRead) -> AgentRunRead:
        self.agent_runs[run.id] = run
        return run

    async def get_agent_run_by_capture(self, capture_id: str) -> AgentRunRead | None:
        for run in self.agent_runs.values():
            if run.capture_id == capture_id:
                return run
        return None

    async def save_report(self, report: ReportRead) -> ReportRead:
        self.reports[report.id] = report
        for draft in report.drafts:
            self.drafts[draft.id] = draft
        return report

    async def get_report_by_capture(self, capture_id: str) -> ReportRead | None:
        for report in self.reports.values():
            if report.capture_id == capture_id:
                return report
        return None

    async def update_draft(
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

    async def regenerate_draft(
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

    async def create_review(self, payload: ReviewDecisionCreate) -> ReviewDecisionRead | None:
        if payload.capture_id not in self.captures:
            return None
        decision = ReviewDecisionRead(**payload.model_dump())
        self.reviews[payload.capture_id].append(decision)
        if payload.target_type == "draft" and payload.target_id in self.drafts:
            draft = self.drafts[payload.target_id]
            status = "approved" if payload.action == ReviewAction.APPROVE else "rejected"
            updated = draft.model_copy(
                update={"review_status": status, "updated_at": datetime.now(UTC)}
            )
            self.drafts[payload.target_id] = updated
            self._replace_report_draft(updated)
        return decision

    async def list_reviews(self, capture_id: str) -> list[ReviewDecisionRead]:
        return self.reviews.get(capture_id, [])

    async def has_crm_sync_approval(self, capture_id: str) -> bool:
        approvals = self.reviews.get(capture_id, [])
        return any(d.action == ReviewAction.APPROVE_CRM_SYNC for d in approvals)

    async def create_crm_sync(
        self, payload: CrmSyncRequest, external_ids: dict | None = None
    ) -> CrmSyncResult | None:
        if not await self.has_crm_sync_approval(payload.capture_id):
            return None
        ids = external_ids or _mock_crm_external_ids()
        result = CrmSyncResult(
            capture_id=payload.capture_id,
            status="completed",
            hubspot_contact_id=ids.get("hubspot_contact_id"),
            hubspot_company_id=ids.get("hubspot_company_id"),
            hubspot_task_id=ids.get("hubspot_task_id"),
            external_url=ids.get("external_url"),
            message=ids.get("message", "CRM sync completed."),
        )
        self.crm_results[result.id] = result
        return result

    async def get_crm_sync(self, job_id: str) -> CrmSyncResult | None:
        return self.crm_results.get(job_id)

    async def get_capture_organization_id(self, capture_id: str) -> str | None:
        capture = self.captures.get(capture_id)
        return str(capture.organization_id) if capture and capture.organization_id else None

    async def get_crm_connection(self, organization_id: str) -> dict | None:
        return self.crm_connections.get(organization_id)

    async def save_crm_connection(
        self, organization_id: str, external_account_id: str | None, encrypted_token_ref: str
    ) -> CrmConnectionRead:
        now = datetime.now(UTC)
        existing = self.crm_connections.get(organization_id)
        connection = {
            "id": existing["id"] if existing else new_id("crmconn"),
            "organization_id": organization_id,
            "provider": "hubspot",
            "external_account_id": external_account_id,
            "encrypted_token_ref": encrypted_token_ref,
            "status": "connected",
            "created_at": existing["created_at"] if existing else now,
            "updated_at": now,
        }
        self.crm_connections[organization_id] = connection
        return _crm_connection_read(connection)

    async def update_crm_connection_tokens(
        self, connection_id: str, encrypted_token_ref: str
    ) -> None:
        for connection in self.crm_connections.values():
            if connection["id"] == connection_id:
                connection["encrypted_token_ref"] = encrypted_token_ref
                connection["updated_at"] = datetime.now(UTC)
                return

    async def save_event_discovery(self, discovery: EventDiscoveryRead) -> EventDiscoveryRead:
        self.event_discoveries[discovery.id] = discovery
        for event in discovery.events:
            self.events[event.id] = event
        return discovery

    async def list_events(self) -> list[IndustryEventRead]:
        return sorted(self.events.values(), key=lambda item: item.created_at, reverse=True)

    async def get_event(self, event_id: str) -> IndustryEventRead | None:
        return self.events.get(event_id)

    async def save_event_site_deep_dive(
        self, deep_dive: EventSiteDeepDiveRead
    ) -> EventSiteDeepDiveRead:
        self.event_site_deep_dives[deep_dive.id] = deep_dive
        for visitor in deep_dive.visitors:
            self.event_site_visitors[visitor.id] = visitor
        return deep_dive

    async def list_event_site_visitors(
        self, event_name: str | None = None
    ) -> list[EventSiteVisitor]:
        normalized = event_name.strip().lower() if event_name else None
        visitors = list(self.event_site_visitors.values())
        if normalized:
            visitors = [
                visitor for visitor in visitors if visitor.event_name.strip().lower() == normalized
            ]
        return sorted(visitors, key=lambda item: item.created_at, reverse=True)

    async def get_event_site_visitor(self, visitor_id: str) -> EventSiteVisitor | None:
        return self.event_site_visitors.get(visitor_id)

    async def mark_event_site_visitor_converted(
        self, visitor_id: str, capture_id: str
    ) -> None:
        visitor = self.event_site_visitors.get(visitor_id)
        if not visitor:
            return
        self.event_site_visitors[visitor_id] = visitor.model_copy(
            update={"status": "converted", "converted_capture_id": capture_id}
        )

    async def save_social_discovery(
        self, discovery: SocialIntentDiscoveryRead
    ) -> SocialIntentDiscoveryRead:
        self.social_discoveries[discovery.id] = discovery
        for candidate in discovery.candidates:
            self.social_candidates[candidate.id] = candidate
        return discovery

    async def list_social_candidates(
        self, event_name: str | None = None
    ) -> list[SocialPostCandidate]:
        normalized = event_name.strip().lower() if event_name else None
        candidates = list(self.social_candidates.values())
        if normalized:
            candidates = [
                candidate
                for candidate in candidates
                if candidate.event_name.strip().lower() == normalized
            ]
        return sorted(candidates, key=lambda item: item.created_at, reverse=True)

    async def get_social_candidate(self, candidate_id: str) -> SocialPostCandidate | None:
        return self.social_candidates.get(candidate_id)

    async def mark_social_candidate_converted(
        self, candidate_id: str, capture_id: str
    ) -> None:
        candidate = self.social_candidates.get(candidate_id)
        if not candidate:
            return
        self.social_candidates[candidate_id] = candidate.model_copy(
            update={"status": "converted", "converted_capture_id": capture_id}
        )

    async def list_playbooks(self) -> list[Playbook]:
        return list(self.playbooks.values())

    async def update_playbook(
        self, playbook_id: str, payload: PlaybookUpsert
    ) -> Playbook | None:
        if playbook_id not in self.playbooks:
            return None
        playbook = Playbook(id=playbook_id, **payload.model_dump())
        self.playbooks[playbook_id] = playbook
        return playbook

    async def list_style_profiles(self) -> list[StyleProfile]:
        return list(self.style_profiles.values())

    async def update_style_profile(
        self, profile_id: str, payload: StyleProfileUpsert
    ) -> StyleProfile | None:
        if profile_id not in self.style_profiles:
            return None
        profile = StyleProfile(id=profile_id, **payload.model_dump())
        self.style_profiles[profile_id] = profile
        return profile

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


class PostgresStore:
    def __init__(self, database_url: str) -> None:
        url, connect_args = _async_database_url(database_url)
        self.engine: AsyncEngine = create_async_engine(
            url,
            connect_args=connect_args,
            pool_pre_ping=True,
        )

    async def close(self) -> None:
        await self.engine.dispose()

    async def create_capture(self, payload: CaptureCreate) -> CaptureRead:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, payload.organization_id)
            resolved_payload = payload.model_copy(update={"organization_id": organization_id})
            dedupe_key = _capture_dedupe_key(resolved_payload)
            existing = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.captures
                        where organization_id = :organization_id
                          and dedupe_key = :dedupe_key
                          and deleted_at is null
                        limit 1
                        """
                    ),
                    {"organization_id": organization_id, "dedupe_key": dedupe_key},
                )
            ).mappings().first()
            if existing:
                capture = await self._capture_from_row(conn, existing)
                return capture.model_copy(update={"was_deduplicated": True})

            row = (
                await conn.execute(
                    text(
                        """
                        insert into public.captures (
                          organization_id,
                          rep_user_id,
                          source,
                          status,
                          raw_text,
                          prospect_name,
                          company_name,
                          event_name,
                          notes,
                          external_message_id,
                          dedupe_key
                        )
                        values (
                          :organization_id,
                          :rep_user_id,
                          :source,
                          'queued',
                          :raw_text,
                          :prospect_name,
                          :company_name,
                          :event_name,
                          :notes,
                          :external_message_id,
                          :dedupe_key
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "rep_user_id": _uuid_or_none(payload.rep_id),
                        "source": payload.source.value,
                        "raw_text": payload.raw_text,
                        "prospect_name": payload.prospect_name,
                        "company_name": payload.company_name,
                        "event_name": payload.event_name,
                        "notes": payload.notes,
                        "external_message_id": payload.external_message_id,
                        "dedupe_key": dedupe_key,
                    },
                )
            ).mappings().one()

            for index, media_url in enumerate(payload.media_urls):
                content_type = (
                    payload.media_content_types[index]
                    if index < len(payload.media_content_types)
                    else None
                )
                await conn.execute(
                    text(
                        """
                        insert into public.capture_assets (
                          organization_id,
                          capture_id,
                          storage_path,
                          content_type,
                          media_url
                        )
                        values (
                          :organization_id,
                          :capture_id,
                          :storage_path,
                          :content_type,
                          :media_url
                        )
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "capture_id": row["id"],
                        "storage_path": media_url,
                        "content_type": content_type,
                        "media_url": media_url,
                    },
                )

            return await self._capture_from_row(conn, row)

    async def list_captures(self) -> list[CaptureRead]:
        async with self.engine.connect() as conn:
            rows = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.captures
                        where deleted_at is null
                        order by created_at desc
                        """
                    )
                )
            ).mappings().all()
            return [await self._capture_from_row(conn, row) for row in rows]

    async def get_capture(self, capture_id: str) -> CaptureRead | None:
        if not _is_uuid(capture_id):
            return None
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.captures
                        where id = :capture_id
                          and deleted_at is null
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).mappings().first()
            if not row:
                return None
            return await self._capture_from_row(conn, row)

    async def mark_capture_queued(self, capture_id: str) -> None:
        await self._update_capture_status(capture_id, CaptureStatus.QUEUED, [])

    async def mark_capture_running(self, capture_id: str) -> None:
        await self._update_capture_status(capture_id, CaptureStatus.RUNNING, None)

    async def mark_capture_review_ready(self, capture_id: str, warnings: list[str]) -> None:
        await self._update_capture_status(capture_id, CaptureStatus.REVIEW_READY, warnings)

    async def mark_capture_failed(self, capture_id: str, warnings: list[str]) -> None:
        await self._update_capture_status(capture_id, CaptureStatus.FAILED, warnings)

    async def save_agent_run(self, run: AgentRunRead) -> AgentRunRead:
        if not _is_uuid(run.capture_id):
            return run
        async with self.engine.begin() as conn:
            organization_id = await self._organization_id_for_capture(conn, run.capture_id)
            if not organization_id:
                return run

            if _is_uuid(run.id):
                existing = (
                    await conn.execute(
                        text("select id from public.agent_runs where id = :id"),
                        {"id": run.id},
                    )
                ).first()
            else:
                existing = None

            if existing:
                row = (
                    await conn.execute(
                        text(
                            """
                            update public.agent_runs
                            set status = :status,
                                error_summary = :error_summary,
                                updated_at = now()
                            where id = :id
                            returning *
                            """
                        ),
                        {
                            "id": run.id,
                            "status": run.status,
                            "error_summary": _first_step_error(run.steps),
                        },
                    )
                ).mappings().one()
            else:
                row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.agent_runs (
                              organization_id,
                              capture_id,
                              status,
                              error_summary
                            )
                            values (
                              :organization_id,
                              :capture_id,
                              :status,
                              :error_summary
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "capture_id": run.capture_id,
                            "status": run.status,
                            "error_summary": _first_step_error(run.steps),
                        },
                    )
                ).mappings().one()

            await conn.execute(
                text("delete from public.agent_steps where agent_run_id = :agent_run_id"),
                {"agent_run_id": row["id"]},
            )
            saved_steps = []
            for step in run.steps:
                step_row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.agent_steps (
                              organization_id,
                              agent_run_id,
                              name,
                              status,
                              input_summary,
                              output_summary,
                              rationale,
                              error,
                              started_at,
                              finished_at
                            )
                            values (
                              :organization_id,
                              :agent_run_id,
                              :name,
                              :status,
                              :input_summary,
                              :output_summary,
                              :rationale,
                              :error,
                              :started_at,
                              :finished_at
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "agent_run_id": row["id"],
                            "name": step.name,
                            "status": step.status,
                            "input_summary": step.input_summary,
                            "output_summary": step.output_summary,
                            "rationale": step.rationale,
                            "error": step.error,
                            "started_at": step.started_at,
                            "finished_at": step.finished_at,
                        },
                    )
                ).mappings().one()
                saved_steps.append(_agent_step_from_row(step_row))

            return AgentRunRead(
                id=str(row["id"]),
                capture_id=str(row["capture_id"]),
                status=row["status"],
                steps=saved_steps,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )

    async def get_agent_run_by_capture(self, capture_id: str) -> AgentRunRead | None:
        if not _is_uuid(capture_id):
            return None
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.agent_runs
                        where capture_id = :capture_id
                        order by created_at desc
                        limit 1
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).mappings().first()
            if not row:
                return None
            steps = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.agent_steps
                        where agent_run_id = :agent_run_id
                        order by started_at asc
                        """
                    ),
                    {"agent_run_id": row["id"]},
                )
            ).mappings().all()
            return AgentRunRead(
                id=str(row["id"]),
                capture_id=str(row["capture_id"]),
                status=row["status"],
                steps=[_agent_step_from_row(step) for step in steps],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )

    async def save_report(self, report: ReportRead) -> ReportRead:
        if not _is_uuid(report.capture_id):
            return report
        async with self.engine.begin() as conn:
            organization_id = await self._organization_id_for_capture(conn, report.capture_id)
            if not organization_id:
                return report

            await conn.execute(
                text("delete from public.signals where capture_id = :capture_id"),
                {"capture_id": report.capture_id},
            )
            await conn.execute(
                text("delete from public.enrichment_sources where capture_id = :capture_id"),
                {"capture_id": report.capture_id},
            )
            await conn.execute(
                text("delete from public.reports where capture_id = :capture_id"),
                {"capture_id": report.capture_id},
            )

            source_map: dict[str, str] = {}
            saved_sources = []
            for source in report.sources:
                source_row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.enrichment_sources (
                              organization_id,
                              capture_id,
                              source_type,
                              title,
                              url,
                              snippet,
                              retrieved_at,
                              confidence,
                              is_personal_social
                            )
                            values (
                              :organization_id,
                              :capture_id,
                              :source_type,
                              :title,
                              :url,
                              :snippet,
                              :retrieved_at,
                              :confidence,
                              :is_personal_social
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "capture_id": report.capture_id,
                            "source_type": source.source_type,
                            "title": source.title,
                            "url": source.url,
                            "snippet": source.snippet,
                            "retrieved_at": source.retrieved_at,
                            "confidence": source.confidence.value,
                            "is_personal_social": source.is_personal_social,
                        },
                    )
                ).mappings().one()
                saved_source = _source_from_row(source_row)
                source_map[source.id] = saved_source.id
                saved_sources.append(saved_source)

            saved_signals = []
            for signal in report.signals:
                source_ids = [source_map.get(source_id, source_id) for source_id in signal.source_ids]
                signal_row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.signals (
                              organization_id,
                              capture_id,
                              signal_type,
                              summary,
                              confidence,
                              reasons,
                              source_ids,
                              inferred
                            )
                            values (
                              :organization_id,
                              :capture_id,
                              :signal_type,
                              :summary,
                              :confidence,
                              cast(:reasons as jsonb),
                              :source_ids,
                              :inferred
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "capture_id": report.capture_id,
                            "signal_type": signal.signal_type,
                            "summary": signal.summary,
                            "confidence": signal.confidence.value,
                            "reasons": _json(signal.reasons),
                            "source_ids": source_ids,
                            "inferred": signal.inferred,
                        },
                    )
                ).mappings().one()
                saved_signals.append(_signal_from_row(signal_row))

            report_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.reports (
                          organization_id,
                          capture_id,
                          contact_snapshot,
                          company_snapshot,
                          strategy,
                          meeting_prep,
                          warnings,
                          confidence
                        )
                        values (
                          :organization_id,
                          :capture_id,
                          cast(:contact_snapshot as jsonb),
                          cast(:company_snapshot as jsonb),
                          cast(:strategy as jsonb),
                          cast(:meeting_prep as jsonb),
                          cast(:warnings as jsonb),
                          :confidence
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "capture_id": report.capture_id,
                        "contact_snapshot": _json(report.contact.model_dump(mode="json")),
                        "company_snapshot": _json(report.company.model_dump(mode="json")),
                        "strategy": _json(report.strategy.model_dump(mode="json")),
                        "meeting_prep": _json(report.meeting_prep.model_dump(mode="json")),
                        "warnings": _json(report.warnings),
                        "confidence": report.confidence.value,
                    },
                )
            ).mappings().one()

            saved_drafts = []
            for draft in report.drafts:
                draft_row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.outreach_drafts (
                              organization_id,
                              capture_id,
                              report_id,
                              channel,
                              draft_type,
                              subject,
                              body,
                              version,
                              inferred_claims_used,
                              inferred_claim_notes,
                              review_status
                            )
                            values (
                              :organization_id,
                              :capture_id,
                              :report_id,
                              :channel,
                              :draft_type,
                              :subject,
                              :body,
                              :version,
                              :inferred_claims_used,
                              cast(:inferred_claim_notes as jsonb),
                              :review_status
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "capture_id": report.capture_id,
                            "report_id": report_row["id"],
                            "channel": draft.channel.value,
                            "draft_type": draft.draft_type.value,
                            "subject": draft.subject,
                            "body": draft.body,
                            "version": draft.version,
                            "inferred_claims_used": draft.inferred_claims_used,
                            "inferred_claim_notes": _json(draft.inferred_claim_notes),
                            "review_status": draft.review_status,
                        },
                    )
                ).mappings().one()
                saved_drafts.append(_draft_from_row(draft_row))

            return _report_from_row(report_row, saved_sources, saved_signals, saved_drafts)

    async def get_report_by_capture(self, capture_id: str) -> ReportRead | None:
        if not _is_uuid(capture_id):
            return None
        async with self.engine.connect() as conn:
            report_row = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.reports
                        where capture_id = :capture_id
                        order by created_at desc
                        limit 1
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).mappings().first()
            if not report_row:
                return None
            sources = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.enrichment_sources
                        where capture_id = :capture_id
                        order by retrieved_at asc
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).mappings().all()
            signals = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.signals
                        where capture_id = :capture_id
                        order by created_at asc
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).mappings().all()
            drafts = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.outreach_drafts
                        where report_id = :report_id
                        order by created_at asc
                        """
                    ),
                    {"report_id": report_row["id"]},
                )
            ).mappings().all()
            return _report_from_row(
                report_row,
                [_source_from_row(source) for source in sources],
                [_signal_from_row(signal) for signal in signals],
                [_draft_from_row(draft) for draft in drafts],
            )

    async def update_draft(
        self, draft_id: str, payload: OutreachDraftUpdate
    ) -> OutreachDraftRead | None:
        if not _is_uuid(draft_id):
            return None
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            async with self.engine.connect() as conn:
                return await self._get_draft(conn, draft_id)

        subject = updates.get("subject")
        body = updates.get("body")
        async with self.engine.begin() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        update public.outreach_drafts
                        set subject = coalesce(:subject, subject),
                            body = coalesce(:body, body),
                            version = version + 1,
                            updated_at = now()
                        where id = :draft_id
                        returning *
                        """
                    ),
                    {"draft_id": draft_id, "subject": subject, "body": body},
                )
            ).mappings().first()
            return _draft_from_row(row) if row else None

    async def regenerate_draft(
        self, draft_id: str, payload: DraftRegenerateRequest
    ) -> OutreachDraftRead | None:
        if not _is_uuid(draft_id):
            return None
        async with self.engine.begin() as conn:
            draft = await self._get_draft(conn, draft_id)
            if not draft:
                return None
            body = f"{draft.body}\n\nRevision command applied: {payload.command}"
            row = (
                await conn.execute(
                    text(
                        """
                        update public.outreach_drafts
                        set body = :body,
                            version = version + 1,
                            updated_at = now()
                        where id = :draft_id
                        returning *
                        """
                    ),
                    {"draft_id": draft_id, "body": body},
                )
            ).mappings().one()
            return _draft_from_row(row)

    async def create_review(self, payload: ReviewDecisionCreate) -> ReviewDecisionRead | None:
        if not _is_uuid(payload.capture_id) or not _is_uuid(payload.target_id):
            return None
        async with self.engine.begin() as conn:
            organization_id = await self._organization_id_for_capture(conn, payload.capture_id)
            if not organization_id:
                return None
            row = (
                await conn.execute(
                    text(
                        """
                        insert into public.review_decisions (
                          organization_id,
                          capture_id,
                          target_type,
                          target_id,
                          action,
                          reviewer_id,
                          reason
                        )
                        values (
                          :organization_id,
                          :capture_id,
                          :target_type,
                          :target_id,
                          :action,
                          :reviewer_id,
                          :reason
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "capture_id": payload.capture_id,
                        "target_type": payload.target_type,
                        "target_id": payload.target_id,
                        "action": payload.action.value,
                        "reviewer_id": _uuid_or_none(payload.reviewer_id),
                        "reason": payload.reason,
                    },
                )
            ).mappings().one()

            if payload.target_type == "draft":
                status = "approved" if payload.action == ReviewAction.APPROVE else "rejected"
                await conn.execute(
                    text(
                        """
                        update public.outreach_drafts
                        set review_status = :status,
                            updated_at = now()
                        where id = :draft_id
                        """
                    ),
                    {"draft_id": payload.target_id, "status": status},
                )
            return _review_from_row(row, fallback_reviewer_id=payload.reviewer_id)

    async def list_reviews(self, capture_id: str) -> list[ReviewDecisionRead]:
        if not _is_uuid(capture_id):
            return []
        async with self.engine.connect() as conn:
            rows = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.review_decisions
                        where capture_id = :capture_id
                        order by created_at asc
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).mappings().all()
            return [_review_from_row(row) for row in rows]

    async def has_crm_sync_approval(self, capture_id: str) -> bool:
        if not _is_uuid(capture_id):
            return False
        async with self.engine.begin() as conn:
            approval = (
                await conn.execute(
                    text(
                        """
                        select id
                        from public.review_decisions
                        where capture_id = :capture_id
                          and action = 'approve_crm_sync'
                        limit 1
                        """
                    ),
                    {"capture_id": capture_id},
                )
            ).first()
            return approval is not None

    async def create_crm_sync(
        self, payload: CrmSyncRequest, external_ids: dict | None = None
    ) -> CrmSyncResult | None:
        if not _is_uuid(payload.capture_id):
            return None
        async with self.engine.begin() as conn:
            organization_id = await self._organization_id_for_capture(conn, payload.capture_id)
            if not organization_id:
                return None
            approval = (
                await conn.execute(
                    text(
                        """
                        select id
                        from public.review_decisions
                        where capture_id = :capture_id
                          and action = 'approve_crm_sync'
                        limit 1
                        """
                    ),
                    {"capture_id": payload.capture_id},
                )
            ).first()
            if not approval:
                return None

            job = (
                await conn.execute(
                    text(
                        """
                        insert into public.crm_sync_jobs (
                          organization_id,
                          capture_id,
                          requested_by,
                          status,
                          target_objects
                        )
                        values (
                          :organization_id,
                          :capture_id,
                          :requested_by,
                          'completed',
                          cast(:target_objects as jsonb)
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "capture_id": payload.capture_id,
                        "requested_by": _uuid_or_none(payload.reviewer_id),
                        "target_objects": _json(
                            {"contact": True, "company": True, "follow_up_task": True}
                        ),
                    },
                )
            ).mappings().one()
            result = (
                await conn.execute(
                    text(
                        """
                        insert into public.crm_sync_results (
                          organization_id,
                          crm_sync_job_id,
                          provider,
                          external_ids,
                          field_diffs
                        )
                        values (
                          :organization_id,
                          :crm_sync_job_id,
                          'hubspot',
                          cast(:external_ids as jsonb),
                          '[]'
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "crm_sync_job_id": job["id"],
                        "external_ids": _json(external_ids or _mock_crm_external_ids()),
                    },
                )
            ).mappings().one()
            return _crm_result_from_row(result, capture_id=payload.capture_id, status=job["status"])

    async def get_crm_sync(self, job_id: str) -> CrmSyncResult | None:
        if not _is_uuid(job_id):
            return None
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        select
                          crm_sync_results.*,
                          crm_sync_jobs.capture_id,
                          crm_sync_jobs.status
                        from public.crm_sync_results
                        join public.crm_sync_jobs
                          on crm_sync_jobs.id = crm_sync_results.crm_sync_job_id
                        where crm_sync_results.id = :job_id
                        """
                    ),
                    {"job_id": job_id},
                )
            ).mappings().first()
            if not row:
                return None
            return _crm_result_from_row(row, capture_id=str(row["capture_id"]), status=row["status"])

    async def get_capture_organization_id(self, capture_id: str) -> str | None:
        if not _is_uuid(capture_id):
            return None
        async with self.engine.connect() as conn:
            return await self._organization_id_for_capture(conn, capture_id)

    async def get_crm_connection(self, organization_id: str) -> dict | None:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, organization_id)
            row = (
                await conn.execute(
                    text(
                        """
                        select id, organization_id, provider, external_account_id,
                               encrypted_token_ref, status, created_at, updated_at
                        from public.crm_connections
                        where organization_id = :organization_id and provider = 'hubspot'
                        order by updated_at desc
                        limit 1
                        """
                    ),
                    {"organization_id": organization_id},
                )
            ).mappings().first()
            if not row:
                return None
            return {
                "id": str(row["id"]),
                "organization_id": str(row["organization_id"]),
                "provider": row["provider"],
                "external_account_id": row["external_account_id"],
                "encrypted_token_ref": row["encrypted_token_ref"],
                "status": row["status"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }

    async def save_crm_connection(
        self, organization_id: str, external_account_id: str | None, encrypted_token_ref: str
    ) -> CrmConnectionRead:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, organization_id)
            row = (
                await conn.execute(
                    text(
                        """
                        insert into public.crm_connections (
                          organization_id, provider, external_account_id,
                          encrypted_token_ref, status
                        )
                        values (:organization_id, 'hubspot', :external_account_id,
                                :encrypted_token_ref, 'connected')
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "external_account_id": external_account_id,
                        "encrypted_token_ref": encrypted_token_ref,
                    },
                )
            ).mappings().one()
            return _crm_connection_read(row)

    async def update_crm_connection_tokens(
        self, connection_id: str, encrypted_token_ref: str
    ) -> None:
        if not _is_uuid(connection_id):
            return
        async with self.engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    update public.crm_connections
                    set encrypted_token_ref = :encrypted_token_ref, updated_at = now()
                    where id = :connection_id
                    """
                ),
                {"connection_id": connection_id, "encrypted_token_ref": encrypted_token_ref},
            )

    async def save_event_discovery(self, discovery: EventDiscoveryRead) -> EventDiscoveryRead:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, discovery.organization_id)
            request = discovery.request.model_copy(update={"organization_id": organization_id})
            discovery_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.event_discoveries (
                          organization_id,
                          rep_user_id,
                          industry,
                          region,
                          date_start,
                          date_end,
                          personas,
                          verticals,
                          keywords,
                          max_events,
                          status,
                          warnings
                        )
                        values (
                          :organization_id,
                          :rep_user_id,
                          :industry,
                          :region,
                          :date_start,
                          :date_end,
                          cast(:personas as jsonb),
                          cast(:verticals as jsonb),
                          cast(:keywords as jsonb),
                          :max_events,
                          :status,
                          cast(:warnings as jsonb)
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "rep_user_id": _uuid_or_none(discovery.rep_id),
                        "industry": request.industry,
                        "region": request.region,
                        "date_start": request.date_start,
                        "date_end": request.date_end,
                        "personas": _json(request.personas),
                        "verticals": _json(request.verticals),
                        "keywords": _json(request.keywords),
                        "max_events": request.max_events,
                        "status": discovery.status,
                        "warnings": _json(discovery.warnings),
                    },
                )
            ).mappings().one()

            saved_events = []
            for event in discovery.events:
                saved_events.append(
                    await self._insert_event(
                        conn,
                        organization_id,
                        str(discovery_row["id"]),
                        event,
                    )
                )

            return EventDiscoveryRead(
                id=str(discovery_row["id"]),
                organization_id=organization_id,
                rep_id=discovery.rep_id,
                request=request,
                status=discovery_row["status"],
                events=saved_events,
                warnings=_parse_json(discovery_row["warnings"], []),
                created_at=discovery_row["created_at"],
            )

    async def list_events(self) -> list[IndustryEventRead]:
        async with self.engine.connect() as conn:
            rows = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.events
                        order by created_at desc
                        """
                    )
                )
            ).mappings().all()
            return [await self._event_from_row(conn, row) for row in rows]

    async def get_event(self, event_id: str) -> IndustryEventRead | None:
        if not _is_uuid(event_id):
            return None
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text("select * from public.events where id = :event_id"),
                    {"event_id": event_id},
                )
            ).mappings().first()
            if not row:
                return None
            return await self._event_from_row(conn, row)

    async def save_event_site_deep_dive(
        self, deep_dive: EventSiteDeepDiveRead
    ) -> EventSiteDeepDiveRead:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, deep_dive.organization_id)
            request = deep_dive.request.model_copy(update={"organization_id": organization_id})
            deep_dive_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.event_site_deep_dives (
                          organization_id,
                          rep_user_id,
                          event_name,
                          event_url,
                          site_text,
                          roles,
                          max_visitors,
                          status,
                          warnings
                        )
                        values (
                          :organization_id,
                          :rep_user_id,
                          :event_name,
                          :event_url,
                          :site_text,
                          cast(:roles as jsonb),
                          :max_visitors,
                          :status,
                          cast(:warnings as jsonb)
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "rep_user_id": _uuid_or_none(deep_dive.rep_id),
                        "event_name": request.event_name,
                        "event_url": request.event_url,
                        "site_text": request.site_text,
                        "roles": _json(request.roles),
                        "max_visitors": request.max_visitors,
                        "status": deep_dive.status,
                        "warnings": _json(deep_dive.warnings),
                    },
                )
            ).mappings().one()

            saved_visitors = []
            for visitor in deep_dive.visitors:
                saved_visitors.append(
                    await self._insert_event_site_visitor(
                        conn,
                        organization_id,
                        str(deep_dive_row["id"]),
                        visitor,
                    )
                )

            return EventSiteDeepDiveRead(
                id=str(deep_dive_row["id"]),
                organization_id=organization_id,
                rep_id=deep_dive.rep_id,
                request=request,
                status=deep_dive_row["status"],
                visitors=saved_visitors,
                warnings=_parse_json(deep_dive_row["warnings"], []),
                created_at=deep_dive_row["created_at"],
            )

    async def list_event_site_visitors(
        self, event_name: str | None = None
    ) -> list[EventSiteVisitor]:
        params = {}
        where_clause = ""
        if event_name:
            where_clause = "where lower(event_name) = lower(:event_name)"
            params["event_name"] = event_name.strip()
        async with self.engine.connect() as conn:
            rows = (
                await conn.execute(
                    text(
                        f"""
                        select *
                        from public.event_site_visitors
                        {where_clause}
                        order by created_at desc
                        """
                    ),
                    params,
                )
            ).mappings().all()
            return [_event_site_visitor_from_row(row) for row in rows]

    async def get_event_site_visitor(self, visitor_id: str) -> EventSiteVisitor | None:
        if not _is_uuid(visitor_id):
            return None
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text("select * from public.event_site_visitors where id = :visitor_id"),
                    {"visitor_id": visitor_id},
                )
            ).mappings().first()
            return _event_site_visitor_from_row(row) if row else None

    async def mark_event_site_visitor_converted(
        self, visitor_id: str, capture_id: str
    ) -> None:
        if not _is_uuid(visitor_id) or not _is_uuid(capture_id):
            return None
        async with self.engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    update public.event_site_visitors
                    set status = 'converted',
                        converted_capture_id = :capture_id,
                        updated_at = now()
                    where id = :visitor_id
                    """
                ),
                {"visitor_id": visitor_id, "capture_id": capture_id},
            )
        return None

    async def save_social_discovery(
        self, discovery: SocialIntentDiscoveryRead
    ) -> SocialIntentDiscoveryRead:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, discovery.organization_id)
            request = discovery.request.model_copy(update={"organization_id": organization_id})
            discovery_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.social_intent_discoveries (
                          organization_id,
                          rep_user_id,
                          event_name,
                          platforms,
                          hashtags,
                          keywords,
                          organizer_handles,
                          sponsor_names,
                          location,
                          date_start,
                          date_end,
                          post_links,
                          pasted_posts,
                          max_posts,
                          status,
                          warnings
                        )
                        values (
                          :organization_id,
                          :rep_user_id,
                          :event_name,
                          cast(:platforms as jsonb),
                          cast(:hashtags as jsonb),
                          cast(:keywords as jsonb),
                          cast(:organizer_handles as jsonb),
                          cast(:sponsor_names as jsonb),
                          :location,
                          :date_start,
                          :date_end,
                          cast(:post_links as jsonb),
                          :pasted_posts,
                          :max_posts,
                          :status,
                          cast(:warnings as jsonb)
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "rep_user_id": _uuid_or_none(discovery.rep_id),
                        "event_name": request.event_name,
                        "platforms": _json(request.platforms),
                        "hashtags": _json(request.hashtags),
                        "keywords": _json(request.keywords),
                        "organizer_handles": _json(request.organizer_handles),
                        "sponsor_names": _json(request.sponsor_names),
                        "location": request.location,
                        "date_start": request.date_start,
                        "date_end": request.date_end,
                        "post_links": _json(request.post_links),
                        "pasted_posts": request.pasted_posts,
                        "max_posts": request.max_posts,
                        "status": discovery.status,
                        "warnings": _json(discovery.warnings),
                    },
                )
            ).mappings().one()

            saved_candidates = []
            for candidate in discovery.candidates:
                saved_candidates.append(
                    await self._insert_social_candidate(
                        conn,
                        organization_id,
                        str(discovery_row["id"]),
                        candidate,
                    )
                )

            return SocialIntentDiscoveryRead(
                id=str(discovery_row["id"]),
                organization_id=organization_id,
                rep_id=discovery.rep_id,
                request=request,
                status=discovery_row["status"],
                candidates=saved_candidates,
                warnings=_parse_json(discovery_row["warnings"], []),
                created_at=discovery_row["created_at"],
            )

    async def list_social_candidates(
        self, event_name: str | None = None
    ) -> list[SocialPostCandidate]:
        params = {}
        where_clause = ""
        if event_name:
            where_clause = "where lower(event_name) = lower(:event_name)"
            params["event_name"] = event_name.strip()
        async with self.engine.connect() as conn:
            rows = (
                await conn.execute(
                    text(
                        f"""
                        select *
                        from public.social_post_candidates
                        {where_clause}
                        order by created_at desc
                        """
                    ),
                    params,
                )
            ).mappings().all()
            return [_social_candidate_from_row(row) for row in rows]

    async def get_social_candidate(self, candidate_id: str) -> SocialPostCandidate | None:
        if not _is_uuid(candidate_id):
            return None
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text("select * from public.social_post_candidates where id = :candidate_id"),
                    {"candidate_id": candidate_id},
                )
            ).mappings().first()
            return _social_candidate_from_row(row) if row else None

    async def mark_social_candidate_converted(
        self, candidate_id: str, capture_id: str
    ) -> None:
        if not _is_uuid(candidate_id) or not _is_uuid(capture_id):
            return None
        async with self.engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    update public.social_post_candidates
                    set status = 'converted',
                        converted_capture_id = :capture_id,
                        updated_at = now()
                    where id = :candidate_id
                    """
                ),
                {"candidate_id": candidate_id, "capture_id": capture_id},
            )
        return None

    async def list_playbooks(self) -> list[Playbook]:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, "demo-org")
            rows = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.playbooks
                        where organization_id = :organization_id
                        order by is_default desc, created_at asc
                        """
                    ),
                    {"organization_id": organization_id},
                )
            ).mappings().all()
            if not rows:
                row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.playbooks (
                              organization_id,
                              name,
                              icp_segments,
                              target_personas,
                              disqualifiers,
                              negative_signals,
                              value_props,
                              products_offered,
                              target_sectors,
                              sector_positioning,
                              priority_signals,
                              trusted_sources,
                              research_resources,
                              research_instructions,
                              competitors,
                              proof_points,
                              personalization_rules,
                              research_freshness_days,
                              is_default
                            )
                            values (
                              :organization_id,
                              :name,
                              cast(:icp_segments as jsonb),
                              cast(:target_personas as jsonb),
                              cast(:disqualifiers as jsonb),
                              cast(:negative_signals as jsonb),
                              cast(:value_props as jsonb),
                              cast(:products_offered as jsonb),
                              cast(:target_sectors as jsonb),
                              cast(:sector_positioning as jsonb),
                              cast(:priority_signals as jsonb),
                              cast(:trusted_sources as jsonb),
                              cast(:research_resources as jsonb),
                              :research_instructions,
                              cast(:competitors as jsonb),
                              cast(:proof_points as jsonb),
                              cast(:personalization_rules as jsonb),
                              :research_freshness_days,
                              true
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "name": DEFAULT_PLAYBOOK_DATA["name"],
                            "icp_segments": _json(DEFAULT_PLAYBOOK_DATA["icp_segments"]),
                            "target_personas": _json(DEFAULT_PLAYBOOK_DATA["target_personas"]),
                            "disqualifiers": _json(DEFAULT_PLAYBOOK_DATA["disqualifiers"]),
                            "negative_signals": _json(DEFAULT_PLAYBOOK_DATA["negative_signals"]),
                            "value_props": _json(DEFAULT_PLAYBOOK_DATA["value_props"]),
                            "products_offered": _json(
                                DEFAULT_PLAYBOOK_DATA["products_offered"]
                            ),
                            "target_sectors": _json(DEFAULT_PLAYBOOK_DATA["target_sectors"]),
                            "sector_positioning": _json(
                                DEFAULT_PLAYBOOK_DATA["sector_positioning"]
                            ),
                            "priority_signals": _json(DEFAULT_PLAYBOOK_DATA["priority_signals"]),
                            "trusted_sources": _json(DEFAULT_PLAYBOOK_DATA["trusted_sources"]),
                            "research_resources": _json(
                                DEFAULT_PLAYBOOK_DATA["research_resources"]
                            ),
                            "research_instructions": DEFAULT_PLAYBOOK_DATA[
                                "research_instructions"
                            ],
                            "competitors": _json(DEFAULT_PLAYBOOK_DATA["competitors"]),
                            "proof_points": _json(DEFAULT_PLAYBOOK_DATA["proof_points"]),
                            "personalization_rules": _json(
                                DEFAULT_PLAYBOOK_DATA["personalization_rules"]
                            ),
                            "research_freshness_days": DEFAULT_PLAYBOOK_DATA[
                                "research_freshness_days"
                            ],
                        },
                    )
                ).mappings().one()
                rows = [row]
            return [_playbook_from_row(row) for row in rows]

    async def update_playbook(
        self, playbook_id: str, payload: PlaybookUpsert
    ) -> Playbook | None:
        if not _is_uuid(playbook_id):
            return None
        async with self.engine.begin() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        update public.playbooks
                        set name = :name,
                            icp_segments = cast(:icp_segments as jsonb),
                            target_personas = cast(:target_personas as jsonb),
                            disqualifiers = cast(:disqualifiers as jsonb),
                            negative_signals = cast(:negative_signals as jsonb),
                            value_props = cast(:value_props as jsonb),
                            products_offered = cast(:products_offered as jsonb),
                            target_sectors = cast(:target_sectors as jsonb),
                            sector_positioning = cast(:sector_positioning as jsonb),
                            priority_signals = cast(:priority_signals as jsonb),
                            trusted_sources = cast(:trusted_sources as jsonb),
                            research_resources = cast(:research_resources as jsonb),
                            research_instructions = :research_instructions,
                            competitors = cast(:competitors as jsonb),
                            proof_points = cast(:proof_points as jsonb),
                            personalization_rules = cast(:personalization_rules as jsonb),
                            research_freshness_days = :research_freshness_days,
                            updated_at = now()
                        where id = :playbook_id
                        returning *
                        """
                    ),
                    {
                        "playbook_id": playbook_id,
                        "name": payload.name,
                        "icp_segments": _json(payload.icp_segments),
                        "target_personas": _json(payload.target_personas),
                        "disqualifiers": _json(payload.disqualifiers),
                        "negative_signals": _json(payload.negative_signals),
                        "value_props": _json(payload.value_props),
                        "products_offered": _json(payload.products_offered),
                        "target_sectors": _json(payload.target_sectors),
                        "sector_positioning": _json(payload.sector_positioning),
                        "priority_signals": _json(payload.priority_signals),
                        "trusted_sources": _json(payload.trusted_sources),
                        "research_resources": _json(payload.research_resources),
                        "research_instructions": payload.research_instructions,
                        "competitors": _json(payload.competitors),
                        "proof_points": _json(payload.proof_points),
                        "personalization_rules": _json(payload.personalization_rules),
                        "research_freshness_days": payload.research_freshness_days,
                    },
                )
            ).mappings().first()
            return _playbook_from_row(row) if row else None

    async def list_style_profiles(self) -> list[StyleProfile]:
        async with self.engine.begin() as conn:
            organization_id = await self._resolve_organization_id(conn, "demo-org")
            rows = (
                await conn.execute(
                    text(
                        """
                        select *
                        from public.style_profiles
                        where organization_id = :organization_id
                        order by is_default desc, created_at asc
                        """
                    ),
                    {"organization_id": organization_id},
                )
            ).mappings().all()
            if not rows:
                row = (
                    await conn.execute(
                        text(
                            """
                            insert into public.style_profiles (
                              organization_id,
                              name,
                              tone,
                              banned_phrases,
                              cta_style,
                              is_default
                            )
                            values (
                              :organization_id,
                              :name,
                              :tone,
                              cast(:banned_phrases as jsonb),
                              :cta_style,
                              true
                            )
                            returning *
                            """
                        ),
                        {
                            "organization_id": organization_id,
                            "name": DEFAULT_STYLE_PROFILE_DATA["name"],
                            "tone": DEFAULT_STYLE_PROFILE_DATA["tone"],
                            "banned_phrases": _json(DEFAULT_STYLE_PROFILE_DATA["banned_phrases"]),
                            "cta_style": DEFAULT_STYLE_PROFILE_DATA["cta_style"],
                        },
                    )
                ).mappings().one()
                rows = [row]
            return [_style_profile_from_row(row) for row in rows]

    async def update_style_profile(
        self, profile_id: str, payload: StyleProfileUpsert
    ) -> StyleProfile | None:
        if not _is_uuid(profile_id):
            return None
        async with self.engine.begin() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        update public.style_profiles
                        set name = :name,
                            tone = :tone,
                            banned_phrases = cast(:banned_phrases as jsonb),
                            cta_style = :cta_style,
                            updated_at = now()
                        where id = :profile_id
                        returning *
                        """
                    ),
                    {
                        "profile_id": profile_id,
                        "name": payload.name,
                        "tone": payload.tone,
                        "banned_phrases": _json(payload.banned_phrases),
                        "cta_style": payload.cta_style,
                    },
                )
            ).mappings().first()
            return _style_profile_from_row(row) if row else None

    async def _update_capture_status(
        self,
        capture_id: str,
        status: CaptureStatus,
        warnings: list[str] | None,
    ) -> None:
        if not _is_uuid(capture_id):
            return None
        params = {"capture_id": capture_id, "status": status.value}
        warning_clause = ""
        if warnings is not None:
            warning_clause = ", warnings = cast(:warnings as jsonb)"
            params["warnings"] = _json(warnings)
        async with self.engine.begin() as conn:
            await conn.execute(
                text(
                    f"""
                    update public.captures
                    set status = :status,
                        updated_at = now()
                        {warning_clause}
                    where id = :capture_id
                    """
                ),
                params,
            )
        return None

    async def _resolve_organization_id(self, conn, organization_id: str) -> str:
        if _is_uuid(organization_id):
            await conn.execute(
                text(
                    """
                    insert into public.organizations (id, name)
                    values (:id, :name)
                    on conflict (id) do nothing
                    """
                ),
                {"id": organization_id, "name": "Default organization"},
            )
            return organization_id

        existing = (
            await conn.execute(
                text(
                    """
                    select id
                    from public.organizations
                    where name = :name
                    order by created_at asc
                    limit 1
                    """
                ),
                {"name": organization_id},
            )
        ).first()
        if existing:
            return str(existing[0])

        row = (
            await conn.execute(
                text(
                    """
                    insert into public.organizations (name)
                    values (:name)
                    returning id
                    """
                ),
                {"name": organization_id or "Default organization"},
            )
        ).first()
        return str(row[0])

    async def _organization_id_for_capture(self, conn, capture_id: str) -> str | None:
        row = (
            await conn.execute(
                text("select organization_id from public.captures where id = :capture_id"),
                {"capture_id": capture_id},
            )
        ).first()
        return str(row[0]) if row else None

    async def _capture_from_row(self, conn, row) -> CaptureRead:
        assets = (
            await conn.execute(
                text(
                    """
                    select media_url, content_type
                    from public.capture_assets
                    where capture_id = :capture_id
                    order by created_at asc
                    """
                ),
                {"capture_id": row["id"]},
            )
        ).mappings().all()
        return CaptureRead(
            id=str(row["id"]),
            organization_id=str(row["organization_id"]),
            rep_id=str(row["rep_user_id"]) if row["rep_user_id"] else "demo-rep",
            source=row["source"],
            status=row["status"],
            raw_text=row["raw_text"] or "",
            prospect_name=row["prospect_name"],
            company_name=row["company_name"],
            event_name=row["event_name"],
            notes=row["notes"],
            external_message_id=row["external_message_id"],
            media_urls=[asset["media_url"] for asset in assets if asset["media_url"]],
            media_content_types=[
                asset["content_type"] for asset in assets if asset["content_type"]
            ],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            dedupe_key=row["dedupe_key"],
            warnings=_parse_json(row["warnings"], []),
        )

    async def _get_draft(self, conn, draft_id: str) -> OutreachDraftRead | None:
        row = (
            await conn.execute(
                text("select * from public.outreach_drafts where id = :draft_id"),
                {"draft_id": draft_id},
            )
        ).mappings().first()
        return _draft_from_row(row) if row else None

    async def _insert_event_site_visitor(
        self,
        conn,
        organization_id: str,
        deep_dive_id: str,
        visitor: EventSiteVisitor,
    ) -> EventSiteVisitor:
        row = (
            await conn.execute(
                text(
                    """
                    insert into public.event_site_visitors (
                      organization_id,
                      event_site_deep_dive_id,
                      event_name,
                      name,
                      title,
                      company,
                      visitor_role,
                      source_url,
                      source_label,
                      evidence,
                      confidence,
                      relevance_reason,
                      suggested_angle,
                      inferred,
                      status,
                      converted_capture_id
                    )
                    values (
                      :organization_id,
                      :event_site_deep_dive_id,
                      :event_name,
                      :name,
                      :title,
                      :company,
                      :visitor_role,
                      :source_url,
                      :source_label,
                      cast(:evidence as jsonb),
                      :confidence,
                      :relevance_reason,
                      :suggested_angle,
                      :inferred,
                      :status,
                      :converted_capture_id
                    )
                    returning *
                    """
                ),
                {
                    "organization_id": organization_id,
                    "event_site_deep_dive_id": deep_dive_id,
                    "event_name": visitor.event_name,
                    "name": visitor.name,
                    "title": visitor.title,
                    "company": visitor.company,
                    "visitor_role": visitor.visitor_role,
                    "source_url": visitor.source_url,
                    "source_label": visitor.source_label,
                    "evidence": _json(visitor.evidence),
                    "confidence": visitor.confidence.value,
                    "relevance_reason": visitor.relevance_reason,
                    "suggested_angle": visitor.suggested_angle,
                    "inferred": visitor.inferred,
                    "status": visitor.status,
                    "converted_capture_id": (
                        visitor.converted_capture_id
                        if _is_uuid(visitor.converted_capture_id)
                        else None
                    ),
                },
            )
        ).mappings().one()
        return _event_site_visitor_from_row(row)

    async def _insert_social_candidate(
        self,
        conn,
        organization_id: str,
        discovery_id: str,
        candidate: SocialPostCandidate,
    ) -> SocialPostCandidate:
        row = (
            await conn.execute(
                text(
                    """
                    insert into public.social_post_candidates (
                      organization_id,
                      social_intent_discovery_id,
                      event_name,
                      platform,
                      author_name,
                      author_handle,
                      author_profile_url,
                      author_company,
                      author_title,
                      post_text,
                      post_url,
                      posted_at,
                      evidence,
                      classification,
                      confidence,
                      relevance_reason,
                      suggested_angle,
                      source_query,
                      inferred,
                      status,
                      converted_capture_id
                    )
                    values (
                      :organization_id,
                      :social_intent_discovery_id,
                      :event_name,
                      :platform,
                      :author_name,
                      :author_handle,
                      :author_profile_url,
                      :author_company,
                      :author_title,
                      :post_text,
                      :post_url,
                      :posted_at,
                      cast(:evidence as jsonb),
                      :classification,
                      :confidence,
                      :relevance_reason,
                      :suggested_angle,
                      :source_query,
                      :inferred,
                      :status,
                      :converted_capture_id
                    )
                    returning *
                    """
                ),
                {
                    "organization_id": organization_id,
                    "social_intent_discovery_id": discovery_id,
                    "event_name": candidate.event_name,
                    "platform": candidate.platform,
                    "author_name": candidate.author_name,
                    "author_handle": candidate.author_handle,
                    "author_profile_url": candidate.author_profile_url,
                    "author_company": candidate.author_company,
                    "author_title": candidate.author_title,
                    "post_text": candidate.post_text,
                    "post_url": candidate.post_url,
                    "posted_at": candidate.posted_at,
                    "evidence": _json(candidate.evidence),
                    "classification": candidate.classification,
                    "confidence": candidate.confidence.value,
                    "relevance_reason": candidate.relevance_reason,
                    "suggested_angle": candidate.suggested_angle,
                    "source_query": candidate.source_query,
                    "inferred": candidate.inferred,
                    "status": candidate.status,
                    "converted_capture_id": (
                        candidate.converted_capture_id
                        if _is_uuid(candidate.converted_capture_id)
                        else None
                    ),
                },
            )
        ).mappings().one()
        return _social_candidate_from_row(row)

    async def _insert_event(
        self,
        conn,
        organization_id: str,
        discovery_id: str,
        event: IndustryEventRead,
    ) -> IndustryEventRead:
        event_row = (
            await conn.execute(
                text(
                    """
                    insert into public.events (
                      organization_id,
                      event_discovery_id,
                      name,
                      event_type,
                      location,
                      starts_on,
                      ends_on,
                      website_url,
                      relevance_summary,
                      fit_reasons,
                      confidence
                    )
                    values (
                      :organization_id,
                      :event_discovery_id,
                      :name,
                      :event_type,
                      :location,
                      :starts_on,
                      :ends_on,
                      :website_url,
                      :relevance_summary,
                      cast(:fit_reasons as jsonb),
                      :confidence
                    )
                    returning *
                    """
                ),
                {
                    "organization_id": organization_id,
                    "event_discovery_id": discovery_id,
                    "name": event.name,
                    "event_type": event.event_type,
                    "location": event.location,
                    "starts_on": event.starts_on,
                    "ends_on": event.ends_on,
                    "website_url": event.website_url,
                    "relevance_summary": event.relevance_summary,
                    "fit_reasons": _json(event.fit_reasons),
                    "confidence": event.confidence.value,
                },
            )
        ).mappings().one()

        source_map: dict[str, str] = {}
        saved_sources = []
        for source in event.sources:
            source_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.event_sources (
                          organization_id,
                          event_id,
                          source_type,
                          title,
                          url,
                          snippet,
                          retrieved_at,
                          confidence
                        )
                        values (
                          :organization_id,
                          :event_id,
                          :source_type,
                          :title,
                          :url,
                          :snippet,
                          :retrieved_at,
                          :confidence
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "event_id": event_row["id"],
                        "source_type": source.source_type,
                        "title": source.title,
                        "url": source.url,
                        "snippet": source.snippet,
                        "retrieved_at": source.retrieved_at,
                        "confidence": source.confidence.value,
                    },
                )
            ).mappings().one()
            saved_source = _event_source_from_row(source_row)
            source_map[source.id] = saved_source.id
            saved_sources.append(saved_source)

        attendee_map: dict[str, str] = {}
        saved_attendees = []
        for attendee in event.attendees:
            source_ids = [source_map.get(source_id, source_id) for source_id in attendee.source_ids]
            attendee_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.event_attendees (
                          organization_id,
                          event_id,
                          name,
                          title,
                          company,
                          attendee_role,
                          relevance_reason,
                          suggested_angle,
                          confidence,
                          source_ids,
                          inferred
                        )
                        values (
                          :organization_id,
                          :event_id,
                          :name,
                          :title,
                          :company,
                          :attendee_role,
                          :relevance_reason,
                          :suggested_angle,
                          :confidence,
                          :source_ids,
                          :inferred
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "event_id": event_row["id"],
                        "name": attendee.name,
                        "title": attendee.title,
                        "company": attendee.company,
                        "attendee_role": attendee.attendee_role,
                        "relevance_reason": attendee.relevance_reason,
                        "suggested_angle": attendee.suggested_angle,
                        "confidence": attendee.confidence.value,
                        "source_ids": source_ids,
                        "inferred": attendee.inferred,
                    },
                )
            ).mappings().one()
            saved_attendee = _event_attendee_from_row(attendee_row)
            attendee_map[attendee.id] = saved_attendee.id
            saved_attendees.append(saved_attendee)

        saved_drafts = []
        for draft in event.drafts:
            attendee_id = attendee_map.get(draft.attendee_id)
            if not attendee_id:
                continue
            draft_row = (
                await conn.execute(
                    text(
                        """
                        insert into public.event_outreach_drafts (
                          organization_id,
                          event_id,
                          event_attendee_id,
                          channel,
                          subject,
                          body,
                          inferred_claims_used
                        )
                        values (
                          :organization_id,
                          :event_id,
                          :event_attendee_id,
                          :channel,
                          :subject,
                          :body,
                          :inferred_claims_used
                        )
                        returning *
                        """
                    ),
                    {
                        "organization_id": organization_id,
                        "event_id": event_row["id"],
                        "event_attendee_id": attendee_id,
                        "channel": draft.channel.value,
                        "subject": draft.subject,
                        "body": draft.body,
                        "inferred_claims_used": draft.inferred_claims_used,
                    },
                )
            ).mappings().one()
            saved_drafts.append(_event_draft_from_row(draft_row))

        return _event_from_parts(event_row, saved_sources, saved_attendees, saved_drafts)

    async def _event_from_row(self, conn, row) -> IndustryEventRead:
        sources = (
            await conn.execute(
                text(
                    """
                    select *
                    from public.event_sources
                    where event_id = :event_id
                    order by retrieved_at asc
                    """
                ),
                {"event_id": row["id"]},
            )
        ).mappings().all()
        attendees = (
            await conn.execute(
                text(
                    """
                    select *
                    from public.event_attendees
                    where event_id = :event_id
                    order by created_at asc
                    """
                ),
                {"event_id": row["id"]},
            )
        ).mappings().all()
        drafts = (
            await conn.execute(
                text(
                    """
                    select *
                    from public.event_outreach_drafts
                    where event_id = :event_id
                    order by created_at asc
                    """
                ),
                {"event_id": row["id"]},
            )
        ).mappings().all()
        return _event_from_parts(
            row,
            [_event_source_from_row(source) for source in sources],
            [_event_attendee_from_row(attendee) for attendee in attendees],
            [_event_draft_from_row(draft) for draft in drafts],
        )


def _capture_dedupe_key(payload: CaptureCreate) -> str:
    seed = "|".join(
        [
            payload.organization_id,
            payload.external_message_id or "",
            payload.event_name.strip().lower() if payload.event_name else "",
            payload.raw_text.strip().lower(),
            ",".join(payload.media_urls),
        ]
    )
    return sha256(seed.encode("utf-8")).hexdigest()


def _async_database_url(database_url: str) -> tuple[URL | str, dict[str, Any]]:
    url = make_url(database_url)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+asyncpg")

    connect_args: dict[str, Any] = {}
    sslmode = url.query.get("sslmode")
    if sslmode:
        url = url.difference_update_query(["sslmode"])
        if sslmode == "disable":
            connect_args["ssl"] = False
        elif sslmode in {"verify-ca", "verify-full"}:
            connect_args["ssl"] = ssl.create_default_context()
        else:
            # libpq `require`/`prefer`/`allow`: encrypt but do not verify the CA.
            # Supabase's connection pooler presents a certificate that does not chain
            # to the system trust store, so full verification would reject an
            # otherwise-valid connection. Use verify-ca/verify-full to opt into checks.
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = context

    return url, connect_args


def _uuid_or_none(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(UUID(str(value)))
    except ValueError:
        return None


def _is_uuid(value: str | None) -> bool:
    return _uuid_or_none(value) is not None


def _json(value: Any) -> str:
    return json.dumps(value, default=str)


def _parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, str):
        return json.loads(value)
    return value


def _first_step_error(steps: list[AgentStep]) -> str | None:
    for step in steps:
        if step.error:
            return step.error
    return None


def _agent_step_from_row(row) -> AgentStep:
    return AgentStep(
        id=str(row["id"]),
        name=row["name"],
        status=row["status"],
        input_summary=row["input_summary"],
        output_summary=row["output_summary"],
        rationale=row["rationale"],
        error=row["error"],
        started_at=row["started_at"],
        finished_at=row["finished_at"],
    )


def _source_from_row(row) -> SourceEvidence:
    return SourceEvidence(
        id=str(row["id"]),
        source_type=row["source_type"],
        title=row["title"] or "Untitled source",
        url=row["url"],
        snippet=row["snippet"] or "",
        retrieved_at=row["retrieved_at"],
        confidence=row["confidence"],
        is_personal_social=row["is_personal_social"],
    )


def _signal_from_row(row) -> Signal:
    return Signal(
        id=str(row["id"]),
        signal_type=row["signal_type"],
        summary=row["summary"],
        confidence=row["confidence"],
        reasons=_parse_json(row["reasons"], []),
        source_ids=[str(source_id) for source_id in row["source_ids"]],
        inferred=row["inferred"],
    )


def _draft_from_row(row) -> OutreachDraftRead:
    return OutreachDraftRead(
        id=str(row["id"]),
        capture_id=str(row["capture_id"]),
        report_id=str(row["report_id"]),
        channel=row["channel"],
        draft_type=row["draft_type"],
        subject=row["subject"],
        body=row["body"],
        version=row["version"],
        inferred_claims_used=row["inferred_claims_used"],
        inferred_claim_notes=_parse_json(row["inferred_claim_notes"], []),
        review_status=row["review_status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _report_from_row(
    row,
    sources: list[SourceEvidence],
    signals: list[Signal],
    drafts: list[OutreachDraftRead],
) -> ReportRead:
    return ReportRead(
        id=str(row["id"]),
        capture_id=str(row["capture_id"]),
        contact=_parse_json(row["contact_snapshot"], {}),
        company=_parse_json(row["company_snapshot"], {}),
        sources=sources,
        signals=signals,
        strategy=_parse_json(row["strategy"], {}),
        meeting_prep=_parse_json(row["meeting_prep"], {}),
        drafts=drafts,
        warnings=_parse_json(row["warnings"], []),
        confidence=row["confidence"],
        created_at=row["created_at"],
    )


def _review_from_row(row, fallback_reviewer_id: str = "demo-rep") -> ReviewDecisionRead:
    return ReviewDecisionRead(
        id=str(row["id"]),
        capture_id=str(row["capture_id"]),
        target_type=row["target_type"],
        target_id=str(row["target_id"]),
        action=row["action"],
        reviewer_id=str(row["reviewer_id"]) if row["reviewer_id"] else fallback_reviewer_id,
        reason=row["reason"],
        created_at=row["created_at"],
    )


def _crm_connection_read(row) -> CrmConnectionRead:
    return CrmConnectionRead(
        id=str(row["id"]),
        organization_id=str(row["organization_id"]),
        provider=row.get("provider", "hubspot") if isinstance(row, dict) else row["provider"],
        external_account_id=row["external_account_id"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _mock_crm_external_ids() -> dict[str, str]:
    return {
        "hubspot_contact_id": "mock-contact",
        "hubspot_company_id": "mock-company",
        "hubspot_task_id": "mock-task",
        "external_url": "https://app.hubspot.com/contacts/mock",
        "message": "Mock HubSpot contact, company, and follow-up task synced.",
    }


def _crm_result_from_row(row, capture_id: str, status: str) -> CrmSyncResult:
    external_ids = _parse_json(row["external_ids"], {})
    return CrmSyncResult(
        id=str(row["id"]),
        capture_id=capture_id,
        status=status,
        hubspot_contact_id=external_ids.get("hubspot_contact_id"),
        hubspot_company_id=external_ids.get("hubspot_company_id"),
        hubspot_task_id=external_ids.get("hubspot_task_id"),
        external_url=external_ids.get("external_url"),
        message=external_ids.get("message", "CRM sync completed."),
        created_at=row["created_at"],
    )


def _playbook_from_row(row) -> Playbook:
    return Playbook(
        id=str(row["id"]),
        name=row["name"],
        icp_segments=_parse_json(row["icp_segments"], []),
        target_personas=_parse_json(row["target_personas"], []),
        disqualifiers=_parse_json(row["disqualifiers"], []),
        negative_signals=_parse_json(row["negative_signals"], []),
        value_props=_parse_json(row["value_props"], []),
        products_offered=_parse_json(row["products_offered"], []),
        target_sectors=_parse_json(row["target_sectors"], []),
        sector_positioning=_parse_json(row["sector_positioning"], []),
        priority_signals=_parse_json(row["priority_signals"], []),
        trusted_sources=_parse_json(row["trusted_sources"], []),
        research_resources=_parse_json(row["research_resources"], []),
        research_instructions=row["research_instructions"] or "",
        competitors=_parse_json(row["competitors"], []),
        proof_points=_parse_json(row["proof_points"], []),
        personalization_rules=_parse_json(row["personalization_rules"], []),
        research_freshness_days=row["research_freshness_days"] or 90,
    )


def _style_profile_from_row(row) -> StyleProfile:
    return StyleProfile(
        id=str(row["id"]),
        name=row["name"],
        tone=row["tone"],
        banned_phrases=_parse_json(row["banned_phrases"], []),
        cta_style=row["cta_style"],
    )


def _event_source_from_row(row) -> EventSource:
    return EventSource(
        id=str(row["id"]),
        source_type=row["source_type"],
        title=row["title"] or "Untitled source",
        url=row["url"],
        snippet=row["snippet"] or "",
        retrieved_at=row["retrieved_at"],
        confidence=row["confidence"],
    )


def _event_attendee_from_row(row) -> EventAttendee:
    return EventAttendee(
        id=str(row["id"]),
        event_id=str(row["event_id"]),
        name=row["name"],
        title=row["title"],
        company=row["company"],
        attendee_role=row["attendee_role"],
        relevance_reason=row["relevance_reason"],
        suggested_angle=row["suggested_angle"],
        confidence=row["confidence"],
        source_ids=[str(source_id) for source_id in row["source_ids"]],
        inferred=row["inferred"],
    )


def _event_draft_from_row(row) -> EventOutreachDraft:
    return EventOutreachDraft(
        id=str(row["id"]),
        event_id=str(row["event_id"]),
        attendee_id=str(row["event_attendee_id"]),
        channel=row["channel"],
        subject=row["subject"],
        body=row["body"],
        inferred_claims_used=row["inferred_claims_used"],
        created_at=row["created_at"],
    )


def _event_site_visitor_from_row(row) -> EventSiteVisitor:
    return EventSiteVisitor(
        id=str(row["id"]),
        organization_id=str(row["organization_id"]),
        deep_dive_id=str(row["event_site_deep_dive_id"])
        if row["event_site_deep_dive_id"]
        else None,
        event_name=row["event_name"],
        name=row["name"],
        title=row["title"],
        company=row["company"],
        visitor_role=row["visitor_role"],
        source_url=row["source_url"],
        source_label=row["source_label"],
        evidence=_parse_json(row["evidence"], []),
        confidence=row["confidence"],
        relevance_reason=row["relevance_reason"],
        suggested_angle=row["suggested_angle"],
        inferred=row["inferred"],
        status=row["status"],
        converted_capture_id=str(row["converted_capture_id"])
        if row["converted_capture_id"]
        else None,
        created_at=row["created_at"],
    )


def _social_candidate_from_row(row) -> SocialPostCandidate:
    return SocialPostCandidate(
        id=str(row["id"]),
        organization_id=str(row["organization_id"]),
        discovery_id=str(row["social_intent_discovery_id"])
        if row["social_intent_discovery_id"]
        else None,
        event_name=row["event_name"],
        platform=row["platform"],
        author_name=row["author_name"],
        author_handle=row["author_handle"],
        author_profile_url=row["author_profile_url"],
        author_company=row["author_company"],
        author_title=row["author_title"],
        post_text=row["post_text"],
        post_url=row["post_url"],
        posted_at=row["posted_at"],
        evidence=_parse_json(row["evidence"], []),
        classification=row["classification"],
        confidence=row["confidence"],
        relevance_reason=row["relevance_reason"],
        suggested_angle=row["suggested_angle"],
        source_query=row["source_query"],
        inferred=row["inferred"],
        status=row["status"],
        converted_capture_id=str(row["converted_capture_id"])
        if row["converted_capture_id"]
        else None,
        created_at=row["created_at"],
    )


def _event_from_parts(
    row,
    sources: list[EventSource],
    attendees: list[EventAttendee],
    drafts: list[EventOutreachDraft],
) -> IndustryEventRead:
    return IndustryEventRead(
        id=str(row["id"]),
        organization_id=str(row["organization_id"]),
        discovery_request_id=str(row["event_discovery_id"]),
        name=row["name"],
        event_type=row["event_type"],
        location=row["location"],
        starts_on=row["starts_on"],
        ends_on=row["ends_on"],
        website_url=row["website_url"],
        relevance_summary=row["relevance_summary"],
        fit_reasons=_parse_json(row["fit_reasons"], []),
        confidence=row["confidence"],
        sources=sources,
        attendees=attendees,
        drafts=drafts,
        created_at=row["created_at"],
    )
