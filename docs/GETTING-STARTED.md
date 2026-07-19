# Getting Started

Run the entire platform locally with **zero external accounts or API keys**. Mock mode is the default: every provider (OCR, enrichment, research, WhatsApp, CRM) returns realistic deterministic data, so you can exercise the full capture → report → review → sync workflow immediately.

## Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) Docker Desktop — only for the containerized run
- (Optional) Supabase CLI — only if you want Postgres persistence instead of in-memory

## 1. Clone and configure

```bash
git clone <repo-url> connexted && cd connexted
cp .env.example .env
```

The defaults in `.env.example` are already correct for local mock mode (`MOCK_PROVIDERS=true`, `PERSISTENCE_BACKEND=memory`, no auth token). Nothing to fill in.

## 2. Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e "backend[dev]"
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok","env":"development"}`.

> If port 8000 is taken, run on another port and set `VITE_API_BASE_URL` accordingly in `frontend/.env.local` (see step 3).

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend reads `VITE_API_BASE_URL` (default `http://localhost:8000`); override it in `frontend/.env.local` if your backend runs elsewhere.

## 4. Try the workflow

1. Go to **Captures** in the app (`/app`).
2. Create a test capture — paste any business-card-style text and conversation notes (mention e.g. "partnership" or "hiring" to trigger signal detection).
3. The capture runs the workflow and flips to **review ready** within seconds.
4. Open it: you'll see the enriched report, GTM signals, pitch strategy, meeting prep brief, and four outreach drafts.
5. Approve/edit/regenerate drafts, then approve CRM sync — in mock mode this records a simulated HubSpot sync.
6. Configure your **Playbook** (`/app/playbook`) — ICP, personas, products, sectors, proof points — and create another capture to see how it changes strategy output.

## 5. Run the checks

```bash
# Backend tests + lint (from repo root, venv active)
python -m pytest backend -q
ruff check backend

# Frontend production build
cd frontend && npm run build
```

## 6. Optional: Postgres persistence (Supabase)

In-memory storage resets on restart. For durable local data:

```bash
supabase start                 # local Supabase stack (DB on port 54322)
supabase db push               # applies supabase/migrations/
```

Then in `.env`: `PERSISTENCE_BACKEND=postgres` and `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres`, and restart the backend. Mock providers keep working with Postgres persistence — the two switches are independent.

## 7. Optional: full Docker run

```bash
docker compose -f infra/docker-compose.yml up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- Redis: localhost:6379 (persistence via AOF volume)

## Where to go next

- Turn individual providers live (Twilio, OCR, enrichment, HubSpot): [Configuration Reference](CONFIGURATION.md)
- Prepare a real deployment: [Deployment Runbook](DEPLOYMENT.md)
- Using a CRM other than HubSpot: [CRM Adapters](CRM-ADAPTERS.md)
