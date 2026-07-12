# CONNEXTed

CONNEXTed is a WhatsApp-first GTM workflow platform for sales and partnership teams.

It turns a rep’s event workflow into a structured, reviewable GTM system: discover relevant events and public prospects before attending, then send a business card image and quick conversation notes through WhatsApp after conversations to receive enriched reports, GTM signals, pitch strategy, and outreach drafts ready for human review.

## Product Vision

Sales and partnership teams lose momentum when promising conversations stay trapped in notebooks, badge scans, camera rolls, and scattered CRM notes. CONNEXTed is designed to make the capture-to-follow-up process fast, contextual, and trustworthy without removing human judgment.

The product helps teams:

- Capture leads from WhatsApp at the moment of conversation.
- Find industry-relevant events before reps attend.
- Recommend 2–3 public speakers, sponsors, exhibitors, organizers, or listed attendees per event.
- Extract and normalize contact details from business cards.
- Enrich people and companies using public sources and internal knowledge.
- Detect GTM signals such as hiring, expansion, partnerships, funding, product launches, and new verticals.
- Generate pitch strategy and outreach drafts grounded in evidence.
- Require human approval before any outreach, export, or CRM sync.
- Learn from approved edits and outcomes to improve future recommendations.

## Core Workflow

### Pre-Event Discovery

1. A rep enters an industry, region, date range, target personas, verticals, and keywords.
2. CONNEXTed finds relevant events and qualifies them against ICP and team playbooks.
3. The platform identifies 2–3 public, high-potential people per event.
4. Each recommendation includes why the event/person is relevant and what evidence supports it.
5. The system generates pre-event outreach angles for review.

### Post-Conversation Capture

1. A rep sends a business card image, prospect details, company name, and conversation notes through WhatsApp.
2. CONNEXTed creates a lead capture and runs a multi-agent workflow.
3. The contact extraction agent parses card and message data into normalized records.
4. The enrichment agent adds company, person, source, and internal-memory context.
5. The signal agent identifies timely GTM reasons to follow up.
6. The strategy agent creates positioning, objections, next best action, and outreach drafts.
7. The rep reviews, edits, approves, rejects, or regenerates each action.
8. Approved records can be synced to HubSpot or exported.

## What The Platform Includes

- WhatsApp-first lead intake.
- Event Radar for industry-relevant event and prospect discovery.
- Multi-agent backend workflow.
- Contact and company enrichment.
- Evidence-backed signal detection.
- Pitch strategy generation.
- Email and LinkedIn outreach drafts.
- Human review and approval controls.
- Rep feedback and regeneration loops.
- CRM sync and CSV export.
- Agent trace visibility.
- Team playbooks and style profiles.
- Supabase-backed auth, database, storage, realtime updates, and vector memory.

## Trust And Review Model

CONNEXTed is built around assisted GTM execution, not blind automation.

- Outreach is never sent automatically.
- CRM sync requires explicit approval.
- Inferred claims are labeled.
- Source-backed facts are preserved with evidence.
- Draft edits and approvals are audited.
- Reps remain the final decision makers.

## Target Users

- Sales reps capturing leads at events, conferences, field meetings, and partner conversations.
- Partnership teams following up with ecosystem, channel, and integration prospects.
- GTM managers who need visibility into lead quality, follow-up consistency, and rep coaching opportunities.
- Revenue operations teams that want cleaner CRM handoff from offline conversations.

## Product Status

This repository currently contains the initial production-shaped scaffold for the CONNEXTed product:

- FastAPI backend with async persistence boundary.
- In-memory local development store.
- Postgres/Supabase-backed store selected with `PERSISTENCE_BACKEND=postgres`.
- LangGraph-oriented workflow structure.
- React dashboard foundation.
- Supabase schema and RLS migration.
- HubSpot/CSV sync interface stubs.
- Product specification in `spec.md`.

The next product milestone is replacing provider stubs with real Supabase Auth/Storage,
OCR, research, LLM, and CRM integrations.

## Backend Development

The backend defaults to local in-memory persistence:

```bash
cd backend
uvicorn app.main:app --reload
```

To run against Supabase/Postgres, set:

```bash
PERSISTENCE_BACKEND=postgres
DATABASE_URL=postgresql+asyncpg://...
```

The database schema lives in `supabase/migrations`. The API still supports mock providers
while using Postgres persistence, so capture/report/review/Event Radar flows can be tested
before OCR, research, LLM, and HubSpot providers are connected.

## Browser Extension

The `browser-extension` directory contains a Chrome/Edge MV3 extension for sending public
social post URLs and selected text into CONNEXTed event folders. Load it unpacked from
`chrome://extensions`, then point it at the backend API and app URL from the extension
connection settings.
