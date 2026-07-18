from datetime import UTC, date, datetime
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
    EVENT_RADAR = "event_radar"
    EVENT_SITE = "event_site"
    SOCIAL_INTENT = "social_intent"


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
    event_name: str | None = None
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


class MeetingPrepBrief(BaseModel):
    objective: str
    agenda: list[str] = Field(default_factory=list)
    talking_points: list[str] = Field(default_factory=list)
    discovery_questions: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)
    likely_objections: list[str] = Field(default_factory=list)
    follow_up_plan: list[str] = Field(default_factory=list)
    crm_notes: list[str] = Field(default_factory=list)


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
    meeting_prep: MeetingPrepBrief
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


class CrmConnectionRead(BaseModel):
    id: str
    organization_id: str
    provider: str = "hubspot"
    external_account_id: str | None = None
    status: str = "connected"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CrmConnectionStatus(BaseModel):
    provider: str = "hubspot"
    configured: bool
    connected: bool
    external_account_id: str | None = None


class PlaybookUpsert(BaseModel):
    name: str
    icp_segments: list[str] = Field(default_factory=list)
    target_personas: list[str] = Field(default_factory=list)
    disqualifiers: list[str] = Field(default_factory=list)
    negative_signals: list[str] = Field(default_factory=list)
    value_props: list[str] = Field(default_factory=list)
    products_offered: list[str] = Field(default_factory=list)
    target_sectors: list[str] = Field(default_factory=list)
    sector_positioning: list[str] = Field(default_factory=list)
    priority_signals: list[str] = Field(default_factory=list)
    trusted_sources: list[str] = Field(default_factory=list)
    research_resources: list[str] = Field(default_factory=list)
    research_instructions: str = ""
    competitors: list[str] = Field(default_factory=list)
    proof_points: list[str] = Field(default_factory=list)
    personalization_rules: list[str] = Field(default_factory=list)
    research_freshness_days: int = Field(default=90, ge=1, le=3650)


class Playbook(PlaybookUpsert):
    id: str


class StyleProfileUpsert(BaseModel):
    name: str
    tone: str
    banned_phrases: list[str] = Field(default_factory=list)
    cta_style: str


class StyleProfile(StyleProfileUpsert):
    id: str


class EventDiscoveryRequest(BaseModel):
    organization_id: str = "demo-org"
    rep_id: str = "demo-rep"
    industry: str
    region: str | None = None
    date_start: date | None = None
    date_end: date | None = None
    personas: list[str] = Field(default_factory=list)
    verticals: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    max_events: int = Field(default=5, ge=1, le=10)


class EventSource(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evsrc"))
    source_type: str
    title: str
    url: str | None = None
    snippet: str
    retrieved_at: datetime = Field(default_factory=utc_now)
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM


class EventAttendee(BaseModel):
    id: str = Field(default_factory=lambda: new_id("att"))
    event_id: str
    name: str
    title: str | None = None
    company: str | None = None
    attendee_role: str
    relevance_reason: str
    suggested_angle: str
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    source_ids: list[str] = Field(default_factory=list)
    inferred: bool = False


class EventOutreachDraft(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evdraft"))
    event_id: str
    attendee_id: str
    channel: DraftChannel
    subject: str | None = None
    body: str
    inferred_claims_used: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class IndustryEventRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evt"))
    organization_id: str
    discovery_request_id: str
    name: str
    event_type: str
    location: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    website_url: str | None = None
    relevance_summary: str
    fit_reasons: list[str] = Field(default_factory=list)
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    sources: list[EventSource] = Field(default_factory=list)
    attendees: list[EventAttendee] = Field(default_factory=list)
    drafts: list[EventOutreachDraft] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class EventDiscoveryRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evdisc"))
    organization_id: str
    rep_id: str
    request: EventDiscoveryRequest
    status: str = "completed"
    events: list[IndustryEventRead] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class EventSiteDeepDiveRequest(BaseModel):
    organization_id: str = "demo-org"
    rep_id: str = "demo-rep"
    event_name: str
    event_url: str | None = None
    site_text: str = ""
    roles: list[str] = Field(
        default_factory=lambda: ["speaker", "sponsor", "exhibitor", "organizer", "attendee"]
    )
    max_visitors: int = Field(default=20, ge=1, le=50)


class EventSiteVisitor(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evsite"))
    organization_id: str
    deep_dive_id: str | None = None
    event_name: str
    name: str
    title: str | None = None
    company: str | None = None
    visitor_role: str
    source_url: str | None = None
    source_label: str = "Event site"
    evidence: list[str] = Field(default_factory=list)
    confidence: ConfidenceLabel = ConfidenceLabel.MEDIUM
    relevance_reason: str
    suggested_angle: str
    inferred: bool = False
    status: str = "confirmed"
    converted_capture_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class EventSiteDeepDiveRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evsitedisc"))
    organization_id: str
    rep_id: str
    request: EventSiteDeepDiveRequest
    status: str = "completed"
    visitors: list[EventSiteVisitor] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class EventSiteVisitorConvertRequest(BaseModel):
    rep_id: str = "demo-rep"
    notes: str | None = None


class SocialIntentDiscoveryRequest(BaseModel):
    organization_id: str = "demo-org"
    rep_id: str = "demo-rep"
    event_name: str
    platforms: list[str] = Field(default_factory=lambda: ["x"])
    hashtags: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    organizer_handles: list[str] = Field(default_factory=list)
    sponsor_names: list[str] = Field(default_factory=list)
    location: str | None = None
    date_start: date | None = None
    date_end: date | None = None
    post_links: list[str] = Field(default_factory=list)
    pasted_posts: str = ""
    max_posts: int = Field(default=10, ge=1, le=50)


class SocialPostCandidate(BaseModel):
    id: str = Field(default_factory=lambda: new_id("soc"))
    organization_id: str
    discovery_id: str | None = None
    event_name: str
    platform: str
    author_name: str | None = None
    author_handle: str | None = None
    author_profile_url: str | None = None
    author_company: str | None = None
    author_title: str | None = None
    post_text: str
    post_url: str | None = None
    posted_at: datetime | None = None
    evidence: list[str] = Field(default_factory=list)
    classification: str
    confidence: ConfidenceLabel = ConfidenceLabel.LOW
    relevance_reason: str
    suggested_angle: str
    source_query: str | None = None
    inferred: bool = True
    status: str = "prospective"
    converted_capture_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class SocialIntentDiscoveryRead(BaseModel):
    id: str = Field(default_factory=lambda: new_id("socdisc"))
    organization_id: str
    rep_id: str
    request: SocialIntentDiscoveryRequest
    status: str = "completed"
    candidates: list[SocialPostCandidate] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class SocialCandidateConvertRequest(BaseModel):
    rep_id: str = "demo-rep"
    notes: str | None = None


# --- Auth (enterprise registration + employee login) ---------------------


class UserRole(StrEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    REP = "rep"


class RegisterOrganizationRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class JoinTeamRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    organization_id: str
    organization_name: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class InviteCodeRead(BaseModel):
    code: str
    organization_id: str
    created_at: datetime = Field(default_factory=utc_now)


class AuthConfig(BaseModel):
    auth_required: bool
