from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def utc_now() -> datetime:
    return datetime.now(UTC)


class CaptureSource(StrEnum):
    WHATSAPP = "whatsapp"
    WEB = "web"


class CaptureStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    REVIEW_READY = "review_ready"
    NEEDS_INPUT = "needs_input"
    FAILED = "failed"


class ConfidenceLabel(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReviewAction(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"
    APPROVE_CRM_SYNC = "approve_crm_sync"
    APPROVE_CSV_EXPORT = "approve_csv_export"
    APPROVE_MERGE = "approve_merge"


class DraftChannel(StrEnum):
    EMAIL = "email"
    LINKEDIN = "linkedin"


class DraftType(StrEnum):
    INITIAL_EMAIL = "initial_email"
    LINKEDIN_CONNECTION = "linkedin_connection"
    LINKEDIN_FOLLOW_UP = "linkedin_follow_up"
    NEXT_STEP_EMAIL = "next_step_email"


class CaptureCreate(BaseModel):
    organization_id: str = "demo-org"
    rep_id: str = "demo-rep"
    source: CaptureSource = CaptureSource.WEB
    raw_text: str = ""
    prospect_name: str | None = None
    company_name: str | None = None
    notes: str | None = None
    external_message_id: str | None = None
    media_urls: list[str] = Field(default_factory=list)
    media_content_types: list[str] = Field(default_factory=list)


class CaptureRead(CaptureCreate):
    id: str = Field(default_factory=lambda: new_id("cap"))
    status: CaptureStatus = CaptureStatus.QUEUED
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    dedupe_key: str | None = None
    was_deduplicated: bool = False
    warnings: list[str] = Field(default_factory=list)


class Contact(BaseModel):
    name: str | None = None
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    confidence_reasons: list[str] = Field(default_factory=list)


class Company(BaseModel):
    name: str | None = None
    website: str | None = None
    industry: str | None = None
    headquarters: str | None = None
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    confidence_reasons: list[str] = Field(default_factory=list)


class SourceEvidence(BaseModel):
    id: str = Field(default_factory=lambda: new_id("src"))
    source_type: str
    title: str
    url: str | None = None
    snippet: str
    retrieved_at: datetime = Field(default_factory=utc_now)
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    is_personal_social: bool = False


class Signal(BaseModel):
    id: str = Field(default_factory=lambda: new_id("sig"))
    signal_type: str
    summary: str
    confidence: ConfidenceLabel
    reasons: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    inferred: bool = False


class PitchStrategy(BaseModel):
    recommended_angle: str
    next_best_action: str
    pain_hypothesis: str
    value_prop: str
    suggested_cta: str
    objections: list[str] = Field(default_factory=list)
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    reasons: list[str] = Field(default_factory=list)


class OutreachDraftRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("draft"))
    capture_id: str
    report_id: str
    channel: DraftChannel
    draft_type: DraftType
    subject: str | None = None
    body: str
    version: int = 1
    inferred_claims_used: bool = False
    inferred_claim_notes: list[str] = Field(default_factory=list)
    review_status: str = "pending"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class OutreachDraftUpdate(BaseModel):
    subject: str | None = None
    body: str | None = None


class DraftRegenerateRequest(BaseModel):
    command: str
    reviewer_note: str | None = None


class ReportRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rpt"))
    capture_id: str
    contact: Contact
    company: Company
    sources: list[SourceEvidence] = Field(default_factory=list)
    signals: list[Signal] = Field(default_factory=list)
    strategy: PitchStrategy
    drafts: list[OutreachDraftRead] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    created_at: datetime = Field(default_factory=utc_now)


class AgentStep(BaseModel):
    id: str = Field(default_factory=lambda: new_id("step"))
    name: str
    status: str
    input_summary: str | None = None
    output_summary: str | None = None
    rationale: str | None = None
    error: str | None = None
    started_at: datetime = Field(default_factory=utc_now)
    finished_at: datetime | None = None


class AgentRunRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("run"))
    capture_id: str
    status: str = "running"
    steps: list[AgentStep] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ReviewDecisionCreate(BaseModel):
    capture_id: str
    target_type: str
    target_id: str
    action: ReviewAction
    reviewer_id: str = "demo-rep"
    reason: str | None = None


class ReviewDecisionRead(ReviewDecisionCreate):
    id: str = Field(default_factory=lambda: new_id("rev"))
    created_at: datetime = Field(default_factory=utc_now)


class CrmSyncRequest(BaseModel):
    capture_id: str
    reviewer_id: str = "demo-rep"


class CrmSyncResult(BaseModel):
    id: str = Field(default_factory=lambda: new_id("crm"))
    capture_id: str
    status: str
    hubspot_contact_id: str | None = None
    hubspot_company_id: str | None = None
    hubspot_task_id: str | None = None
    external_url: str | None = None
    message: str
    created_at: datetime = Field(default_factory=utc_now)


class Playbook(BaseModel):
    id: str
    name: str
    icp_segments: list[str]
    disqualifiers: list[str]
    value_props: list[str]


class StyleProfile(BaseModel):
    id: str
    name: str
    tone: str
    banned_phrases: list[str]
    cta_style: str

