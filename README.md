# CONNEXTed

WhatsApp-first GTM multi-agent workflow platform for sales and partnership teams.

This repo is scaffolded as a production-shaped monorepo:

- `backend/` — FastAPI API, async workflow runner, provider adapters, and worker entrypoints.
- `frontend/` — React + JavaScript + Vite dashboard.
- `supabase/` — Postgres schema, RLS, storage, and vector-memory migrations.
- `infra/` — local and deployment infrastructure.
- `spec.md` — product and implementation specification.

## Local Development

1. Copy `.env.example` to `.env`.
2. Fill Supabase, Twilio, Claude, Tavily, Google Vision, and HubSpot values as available.
3. Start local infra:

```bash
docker compose -f infra/docker-compose.yml up
```

4. Run the backend:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

5. Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The backend defaults to mock provider behavior when `MOCK_PROVIDERS=true`.

