# WhatsApp-First GTM Multi-Agent Workflow Platform Spec

## 1. Product Summary

Build a production v1 monorepo for a WhatsApp-first GTM workflow platform used by sales and partnership teams. Reps submit a business card image plus optional prospect name, company, and conversation notes through WhatsApp. The backend stores the capture, runs a multi-agent workflow, enriches the person/company, identifies GTM signals, generates pitch strategy and outreach drafts, and routes all outbound actions through human review. The platform also includes Event Radar for finding industry-relevant events and 2–3 public, high-potential people per event before reps attend or reach out.

The system prioritizes useful partial outputs over blocking on perfect enrichment. When public or internal research is incomplete, the workflow should still produce a conservative review-ready report with missing-data warnings, confidence labels, and clearly marked inferred claims.

## 2. Technology Stack

- **Backend:** Python, FastAPI, LangGraph, Claude API as primary LLM, Pydantic typed outputs, SQLAlchemy, Alembic, pytest.
- **Worker:** Separate Python worker container for OCR, enrichment, signal detection, draft generation, retries, and CRM sync jobs.
- **Queue:** Redis-backed job queue for async workflow execution.
- **Database/platform:** Supabase Auth, Postgres, Storage, Realtime, Row Level Security, and `pgvector` vector memory.
- **Frontend:** React + JavaScript + Vite, Supabase JS, TanStack Query, React Router, Tailwind/shadcn-style components.
- **WhatsApp intake:** Twilio WhatsApp webhook for v1.
- **OCR:** Google Vision `DOCUMENT_TEXT_DETECTION` first; Tesseract fallback for local development or provider failure.
- **Research/enrichment:** Tavily/public web search, source extraction, internal Supabase memory search, and provider interfaces for future paid APIs.
- **Event discovery:** Tavily/public web research over event websites, agendas, speaker pages, sponsor pages, exhibitor lists, organizer pages, and publicly listed attendee pages.
- **CRM/export:** HubSpot sync plus CSV export fallback.
- **Infrastructure:** Docker Compose for local development; Dockerized backend/worker deployable to cloud hosts; managed Supabase.

## 3. Core Workflow

1. A rep sends a WhatsApp message containing a business card image and optional text fields.
2. Twilio posts the message/media webhook to FastAPI.
3. The backend validates the Twilio signature, deduplicates the submission, stores media in Supabase Storage, and creates a `capture`.
4. A worker starts a LangGraph `agent_run` for the capture.
5. The workflow extracts contact details through OCR and text parsing.
6. The workflow enriches the person and company using internal memory plus allowed public sources.
7. The workflow identifies GTM signals such as hiring, expansion, partnerships, new verticals, product launches, funding, leadership changes, or market movement.
8. The workflow scores fit and timing, generates a pitch strategy, and creates outreach drafts.
9. The workflow produces a review-ready report even if some enrichment failed, as long as minimum contact and strategy data exist.
10. The original rep reviews each action independently in the web app.
11. Approved actions can be copied, exported, or synced to HubSpot. The system does not automatically send email or LinkedIn outreach.

## 3.1 Event Radar Workflow

1. A rep enters industry, region, date range, target personas, verticals, and optional keywords.
2. The event discovery agent finds relevant conferences, roundtables, webinars, meetups, trade shows, and partner events.
3. The event qualification agent scores each event against ICP, playbooks, source quality, timing, region, and persona fit.
4. The attendee discovery agent finds 2–3 public prospects per event, prioritizing speakers, sponsors, exhibitors, organizers, panelists, and explicitly public attendee lists.
5. The prospect ranking agent explains why each person is relevant and labels any inferred role/context.
6. The outreach agent generates pre-event email draft angles for human review.
7. Reps can save recommended events/prospects and later convert a person into the normal capture/contact workflow.

## 4. Agent Workflow Requirements

### 4.1 Agent Graph

Use LangGraph with durable persistence and one thread per `agent_run`.

Required nodes:

- **Intake normalization:** Parse WhatsApp message text, uploaded media metadata, rep identity, and capture context.
- **OCR/contact extraction:** Extract and normalize name, title, company, email, phone, website, address, social handles, and confidence.
- **Entity resolution:** Match against existing contacts/companies and create merge suggestions when conflicts exist.
- **Internal memory retrieval:** Retrieve relevant playbooks, previous approved examples, account notes, and historical pitch outcomes.
- **Public enrichment:** Use Tavily/public web and allowed source classes to enrich the person and company.
- **Signal detection:** Detect, classify, score, and source GTM signals.
- **Pitch strategy:** Generate recommended angle, pain hypothesis, value proposition, CTA, objections, and next best action.
- **Draft generation:** Generate email draft, LinkedIn connection request, LinkedIn follow-up, and next-step email.
- **Review interrupt:** Pause before any export/sync action and wait for human review.
- **Feedback regeneration:** On rep feedback, rerun strategy and draft nodes by default while keeping extracted/enriched facts stable unless facts are explicitly challenged.
- **CRM/export:** After approval, create/update HubSpot records or generate CSV export.
- **Event discovery:** Find relevant industry events, store event sources, and recommend 2–3 public prospects per event.
- **Event outreach:** Generate pre-event outreach drafts using only event evidence and labeled inferences.

### 4.2 Agent Output Policy

- All agent outputs must be validated with Pydantic schemas.
- External facts must include source URL or internal memory reference, retrieved timestamp, and confidence.
- Inferred claims are allowed only when explicitly labeled as inferred.
- Inferred claims must remain visible in the report review UI and must not be silently presented as verified facts.
- Drafts can use inferred personalization only if the reviewer approves that specific draft/action.
- Every signal must include source evidence, recency, relevance, and confidence.
- Event recommendations must identify whether a person is a speaker, sponsor, exhibitor, organizer, panelist, or public attendee; do not imply private attendance.
- Agent traces must expose structured inputs, outputs, tool calls, errors, source links, confidence, and concise rationale. Do not expose raw hidden chain-of-thought.

### 4.3 Failure And Retry Policy

- Use step-level bounded retries with exponential backoff for transient provider failures.
- If OCR fails, try fallback OCR and allow manual correction in the UI.
- If enrichment partially fails, continue with available evidence and mark missing sections clearly.
- If a provider is down, preserve step error details in `agent_steps` and continue where safe.
- Whole-run retries should be manual and should not duplicate captures or overwrite approved review decisions.

## 5. WhatsApp Intake

WhatsApp is intake-only for v1.

Required behavior:

- Accept business card images and accompanying free-form notes.
- Accept optional structured text such as prospect name, company, title, and conversation notes.
- Validate Twilio signatures.
- Deduplicate by Twilio message/media IDs and perceptual image hash inside a configurable capture window.
- Store inbound media in Supabase Storage using organization-scoped paths.
- Send only minimal acknowledgements and failure notifications through WhatsApp.
- Do not support approval, rejection, regeneration, or CRM sync from WhatsApp in v1.

## 6. Data Model

Every business table must include `organization_id`, timestamps, status fields where relevant, and audit-friendly ownership fields.

### 6.1 Identity And Tenancy

- `organizations`
- `memberships`
- `rep_profiles`
- Roles: `rep`, `manager`, `admin`

Role behavior:

- Reps manage their own captures, reports, drafts, feedback, and review decisions.
- Managers can view team activity, reports, review state, and coaching-relevant edits.
- Admins manage organization settings, integrations, playbooks, style profiles, retention settings, and users.

### 6.2 Capture And Entity Tables

- `captures`: WhatsApp submission, rep, status, raw text, normalized notes, dedupe key, source channel.
- `capture_assets`: stored image/media metadata, OCR status, retention metadata, storage path.
- `contacts`: normalized person data.
- `companies`: normalized company/account data.
- `contact_company_roles`: person-company relationship, title, department, seniority, source.
- `merge_suggestions`: field-level contact/company conflicts requiring review.

Conflict policy:

- Do not let latest capture automatically overwrite existing contact/company records.
- Create reviewable merge suggestions with old value, new value, source, confidence, and recommended action.
- CRM values should be shown in merge/diff flows before overwrites.

### 6.3 Workflow And Report Tables

- `agent_runs`: workflow instance, graph state, status, started/finished timestamps, error summary.
- `agent_steps`: node-level inputs, outputs, tool calls, retry count, errors, duration.
- `agent_events`: realtime event stream for dashboard updates.
- `enrichment_sources`: public/internal source records and extracted facts.
- `signals`: signal type, evidence, confidence, score, recency, source IDs.
- `reports`: review-ready summary, strategy, score, warnings, generated-at metadata.
- `outreach_drafts`: channel, draft type, subject/body, inferred-claim usage, review state.

### 6.4 Review, Feedback, CRM, And Memory Tables

- `review_decisions`: per-action approval, rejection, edit, export, or sync decision.
- `feedback_requests`: rep steering instructions and regeneration history.
- `crm_connections`: HubSpot org connection metadata and encrypted credentials/token references.
- `crm_sync_jobs`: requested sync action, status, target CRM objects, reviewer.
- `crm_sync_results`: HubSpot object IDs, sync output, field-level diffs, error details.
- `memory_documents`: uploaded or system-generated org memory sources.
- `memory_chunks`: chunked playbooks, approved outcomes, examples, account notes.
- `memory_embeddings`: vector rows for `pgvector` similarity search.

### 6.5 Event Radar Tables

- `event_discoveries`: rep query, industry, region, date range, personas, verticals, keywords, warnings, status.
- `events`: recommended event, type, location, dates, website, fit reasons, confidence, save status.
- `event_sources`: event website, agenda, speaker, sponsor, exhibitor, organizer, and public attendee evidence.
- `event_attendees`: 2–3 public prospects per event, attendee role, company/title, relevance reason, suggested angle, confidence.
- `event_recommendations`: ranked event recommendations for a rep/team.
- `event_outreach_drafts`: pre-event email/LinkedIn drafts that remain review-gated before use.

Memory policy:

- Approved edits and approved drafts automatically become reusable organization memory.
- Store memory with tags for segment, persona, channel, signal type, product/value prop, rep/team, and approval metadata.
- Do not train on rejected drafts or unapproved inferred claims.

## 7. Enrichment And Source Policy

Allowed v1 source classes:

- Company websites, blogs, landing pages, and press pages.
- Careers pages and public job listings.
- Public news, funding announcements, SEC/regulatory filings where relevant.
- Public business directories and company databases.
- Public personal social/profile pages when relevant to business context.
- Event websites, agendas, speaker pages, sponsor pages, exhibitor lists, organizer pages, and explicitly public attendee lists.
- Internal Supabase memory, playbooks, account notes, and approved examples.

Source handling:

- Store source URL, title, snippet/extracted text, retrieval timestamp, provider, and confidence.
- Label personal-social facts distinctly so reviewers can judge whether to use them.
- Provide source filtering hooks so organizations can later restrict to approved domains.
- Do not rely on unsourced LLM memory for factual claims.
- Do not infer private attendance from social media or event marketing pages; label people by public role only.

## 8. GTM Strategy Rules

### 8.1 Playbooks And ICP

Use configurable in-app playbooks as the source of truth for ICP, qualification rules, personas, value props, proof points, objection handling, and competitive positioning.

Admins must be able to configure:

- ICP segments and disqualifiers.
- Target personas and buying committee roles.
- Product/value proposition mappings.
- Proof points and customer examples.
- Banned claims or phrases.
- Signal-to-pitch guidance.
- Channel-specific CTA preferences.

### 8.2 Style Profiles

Use team-level style profiles for outreach tone and format.

Profiles should control:

- Tone, length, reading level, and directness.
- CTA style and meeting ask.
- Channel-specific formatting.
- Banned phrases.
- Template sections that should remain stable.
- Whether inferred claims may appear in draft candidates.

### 8.3 Signal Scoring

Use weighted fit + timing scoring.

Score inputs:

- ICP fit.
- Signal strength.
- Signal recency.
- Evidence quality.
- Persona relevance.
- Conversation-note relevance.
- Internal-memory match.

Display scores as high/medium/low badges with short reasons and source counts, not false-precision numeric scores.

## 9. Human Review Requirements

Review is owned by the original rep by default.

Approval granularity:

- Email draft approval.
- LinkedIn connection request approval.
- LinkedIn follow-up approval.
- Next-step email approval.
- CRM sync approval.
- CSV export approval.
- Merge suggestion approval.

Rules:

- One approval must not unlock unrelated actions.
- A draft edited by the rep must preserve both generated and final approved versions.
- Approval records must include reviewer, timestamp, action type, final content, and whether inferred claims are included.
- Rejections must capture a reason when possible.
- CRM sync and CSV export require explicit approval even if drafts are already approved.

## 10. Frontend UX

### 10.1 Primary Screens

- Capture dashboard.
- Review queue.
- Capture detail.
- Enriched report.
- Agent trace.
- Draft review/editor.
- Event Radar.
- Feedback/regeneration panel.
- Merge suggestion review.
- CRM sync status.
- Playbook and style profile admin.
- Organization settings and integration settings.

### 10.2 Dashboard And Queue

Default review queue sorting should be action-priority based:

- Weighted opportunity score.
- Freshness.
- Review readiness.
- Missing-data warnings.
- Sync/export status.

### 10.3 Report Screen

The report screen should prioritize an action card above the fold:

- Recommended angle.
- Best next action.
- Priority/confidence badge.
- Key reason to act now.
- Draft review actions.
- Warnings about missing or inferred data.

Secondary sections:

- Contact and company facts.
- GTM signal evidence.
- Pitch strategy.
- Outreach drafts.
- Merge suggestions.
- Source evidence.
- Agent trace and concise rationale.

### 10.4 Draft Editing

Use a rich editor plus controlled AI commands.

Supported commands:

- Shorter.
- Warmer.
- More executive.
- More direct.
- Emphasize a selected signal.
- Remove inferred claims.
- Change CTA.
- Match selected style profile.

Every regeneration should create a new draft version and preserve prior versions.

### 10.5 Confidence UX

- Use high/medium/low badges with reasons and source counts.
- Show missing-data warnings clearly.
- Show inferred-claim badges inline.
- Avoid raw numeric scores in the primary UI unless used internally.

### 10.6 Event Radar Screen

- Provide inputs for industry, region, date range, personas, verticals, keywords, and max events.
- Show recommended events with fit reasons, confidence, warnings, and source evidence.
- Show 2–3 recommended public people per event with role, company/title, relevance reason, and suggested angle.
- Label speaker/sponsor/exhibitor/organizer/public-attendee roles explicitly.
- Show generated pre-event drafts as reviewable suggestions, not automatically sent outreach.

## 11. CRM And Export

### 11.1 HubSpot Sync

HubSpot v1 sync should create or update:

- Contact.
- Company.
- Follow-up task assigned to the rep.
- Notes containing approved summary, signal evidence, and source links where appropriate.

Conflict behavior:

- Show field-level diff before overwriting existing HubSpot values.
- Allow filling blank CRM fields without extra conflict review.
- Preserve CRM object IDs and sync results.
- Do not create deals or sequences in v1.

### 11.2 Lifecycle After Sync

- Track sync status and external HubSpot links only.
- Downstream sales activity remains in HubSpot for v1.
- CSV export remains available for approved records as a fallback.

## 12. Security, Privacy, And Governance

- Use Supabase Auth for users and sessions.
- Enforce organization-scoped RLS across all business data.
- Backend verifies Supabase JWTs for API requests.
- Service role key is server-side only.
- Use signed storage URLs for card images and source artifacts.
- Encrypt provider tokens and HubSpot credentials/token references.
- Use platform-managed provider credentials for Twilio, OCR, search, LLM, and embeddings in v1.
- Use organization-level HubSpot connections.
- Retain business card images and raw OCR text under configurable retention policy.
- Support soft delete immediately followed by retention-aware purge jobs for assets, memory references, and PII.
- Keep decision and data-lineage audit records for source facts, agent outputs, draft edits, approvals, exports, and CRM writes.

## 13. Public APIs

### 13.1 Webhooks

- `POST /webhooks/twilio/whatsapp`
  - Validates Twilio signature.
  - Ingests WhatsApp text/media.
  - Creates or deduplicates a capture.
  - Queues the agent workflow.

### 13.2 Capture And Report APIs

- `GET /captures`
- `GET /captures/:id`
- `POST /captures/:id/retry`
- `GET /reports/:capture_id`
- `GET /reports/:capture_id/sources`
- `GET /agent-runs/:id`
- `GET /agent-runs/:id/steps`

### 13.3 Draft, Feedback, And Review APIs

- `PATCH /drafts/:id`
- `POST /drafts/:id/regenerate`
- `POST /feedback/:report_id/regenerate`
- `POST /reviews`
- `GET /reviews/:capture_id`
- `POST /merge-suggestions/:id/resolve`

### 13.4 CRM And Export APIs

- `POST /crm/hubspot/connect`
- `POST /crm/hubspot/sync`
- `GET /crm/jobs/:id`
- `GET /exports/csv`

### 13.5 Admin APIs

- `GET/POST/PATCH /playbooks`
- `GET/POST/PATCH /style-profiles`
- `GET/PATCH /organization/settings`
- `GET/POST/PATCH /integrations`

### 13.6 Event Radar APIs

- `POST /events/discover`: discover and rank relevant events and public prospects.
- `GET /events`: list saved or discovered events.
- `GET /events/:event_id`: fetch event details, sources, attendees, and pre-event drafts.

## 14. Realtime And Observability

- Use Supabase Realtime for capture status, agent run status, review state, and CRM sync updates.
- Persist structured logs for webhook receipt, workflow step transitions, provider calls, retries, review decisions, and sync jobs.
- Optional LangSmith tracing can be enabled through environment variables.
- Agent trace UI reads persisted `agent_steps`; it must not depend on third-party tracing availability.
- Expose retryable vs non-retryable errors clearly in the UI.

## 15. Test Plan

### 15.1 Backend Unit Tests

- WhatsApp parsing and Twilio signature validation.
- Idempotent capture dedupe by message/media ID and perceptual hash.
- OCR normalization and fallback handling.
- Contact/company dedupe and merge suggestion generation.
- Source-policy labeling, including personal social source labels.
- Signal classification and scoring.
- Draft schema validation and inferred-claim labeling.
- Review gating for drafts, export, CRM sync, and merge approval.
- HubSpot payload mapping and field-level diff generation.
- Event discovery request validation, event ranking, attendee role labeling, and pre-event draft generation.

### 15.2 Workflow Tests

- Happy path from WhatsApp capture to review-ready report.
- Partial enrichment failure still produces conservative report.
- OCR failure falls back or requests manual correction.
- Step-level retries do not duplicate captures.
- Feedback regeneration reruns strategy/drafts only.
- Approved edits become memory; rejected drafts do not.
- Human review interrupt/resume works reliably.
- Event Radar returns relevant events with 2–3 public prospects per event and labeled source constraints.

### 15.3 Database Tests

- Alembic migration validity.
- RLS tenant isolation for every core table.
- Role access for rep, manager, and admin.
- Soft delete and purge eligibility.
- Vector memory insert and similarity search RPCs.
- Audit lineage for sources, edits, approvals, exports, and syncs.
- RLS tenant isolation for event discoveries, events, attendees, sources, recommendations, and event outreach drafts.

### 15.4 Frontend Tests

- Capture dashboard and action-priority review queue.
- Report action card and warning display.
- Evidence and inferred-claim badges.
- Draft rich editor and controlled AI commands.
- Feedback regeneration flow.
- Per-action review decisions.
- Merge suggestion review.
- HubSpot diff review and sync status.
- Agent trace with concise rationale.
- Event Radar discovery form, event cards, attendee cards, confidence labels, warnings, and pre-event drafts.

## 16. Acceptance Criteria

- A rep can submit a card image and notes through WhatsApp and see a review-ready report in the web app.
- The report contains normalized contact/company data, sourced enrichment, detected signals, a priority recommendation, pitch strategy, and four outreach drafts.
- The system produces partial reports when enrichment fails and clearly marks missing or inferred data.
- Reps approve each outbound or sync action independently.
- No email, LinkedIn, CRM sync, or CSV export action can occur without explicit human approval.
- Approved HubSpot sync creates/updates contact and company records and creates a follow-up task.
- Field conflicts are shown before overwriting existing contact/company/CRM values.
- Agent traces show structured steps, tool calls, confidence, errors, sources, and concise rationale.
- Approved edits and drafts become tagged organization memory for future recommendations.
- A rep can discover industry-relevant events and see 2–3 publicly sourced prospects per event with relevance reasons and pre-event draft suggestions.
- RLS prevents cross-organization access.

## 17. Defaults And Assumptions

- Production v1 targets team workspaces.
- Original rep owns review by default.
- Managers have visibility for coaching and team oversight.
- Admins own integrations, playbooks, style profiles, users, and retention settings.
- WhatsApp is intake-only in v1.
- Twilio is the initial WhatsApp provider.
- Claude API is the primary LLM.
- Embeddings use a separate fixed embedding model for vector consistency.
- Tavily/public web research and internal memory are both used.
- Public personal social/profile sources are allowed but labeled distinctly.
- Provider credentials are platform-managed by default except HubSpot organization connections.
- Business card images and raw OCR are retained under policy, not deleted immediately.
- Deletion uses soft delete plus purge jobs.
- Review queue uses action-priority sorting.
- Draft UX uses rich editing plus controlled AI commands.
- Confidence is displayed with badges and reasons, not primary numeric scores.
- CRM v1 tracks sync status and external links only; downstream lifecycle remains in HubSpot.
- Event Radar v1 uses public role evidence and does not claim private attendance unless an attendee list is explicitly public.
