# Deployment Runbook

Everything needed to deploy is prepared and verified (images build, compose config validates). This document is the runbook for when you decide to deploy — nothing here has been deployed yet.

## Topology

```
Internet ──> Reverse proxy / CDN (TLS)          e.g. Caddy, nginx, Cloudflare
              ├── app.<domain>      → frontend container (nginx :80, static SPA)
              └── api.<domain>      → backend container (uvicorn :8000)
                                        └── Redis (queue/cache, AOF-persisted)
              Managed Supabase Postgres (schema via supabase/migrations)
              Twilio WhatsApp webhook → api.<domain>/webhooks/twilio/whatsapp
              HubSpot OAuth redirect → api.<domain>/api/crm/hubspot/callback
```

Containers: `backend/Dockerfile` (non-root, healthcheck on `/health`), `frontend/Dockerfile` (multi-stage Node build → nginx with SPA fallback, gzip, immutable asset caching), orchestrated by `infra/docker-compose.yml` (healthchecks, restart policies, Redis volume).

## Pre-deploy checklist

**Environment (`.env` on the host — never commit it):**
- [ ] `APP_ENV=production`
- [ ] `MOCK_PROVIDERS=false`
- [ ] `PERSISTENCE_BACKEND=postgres` + hosted `DATABASE_URL` (use Supabase's pooler string)
- [ ] `AUTH_REQUIRED=true` and `AUTH_JWT_SECRET=$(openssl rand -hex 32)` — turns on enterprise/employee login for the whole API
- [ ] (Optional) `API_AUTH_TOKEN=$(openssl rand -hex 32)` for service scripts/CI; put it in `VITE_API_AUTH_TOKEN` only if you want the frontend usable without user login
- [ ] `FRONTEND_ORIGIN=https://app.<domain>` (exact origin, no trailing slash)
- [ ] `API_BASE_URL=https://api.<domain>`
- [ ] Provider keys you're going live with (see [Configuration](CONFIGURATION.md)); leave the rest empty — they degrade to mock/skip
- [ ] `HUBSPOT_REDIRECT_URI=https://api.<domain>/api/crm/hubspot/callback` and the same URL saved in the HubSpot app settings
- [ ] `HUBSPOT_TOKEN_ENCRYPTION_KEY` generated and backed up (losing it invalidates stored CRM connections)

**Database:**
- [ ] `supabase link --project-ref <ref>` then `supabase db push` (applies all 15 migrations, incl. RLS and the `app_users`/`org_invites` auth tables)
- [ ] Verify: connect and check `select count(*) from public.crm_connections;` runs

**External services:**
- [ ] Twilio WhatsApp sender approved (or sandbox for pilot); webhook URL set to `POST https://api.<domain>/webhooks/twilio/whatsapp`
- [ ] HubSpot app scopes match `HUBSPOT_SCOPES`

**Validation (run locally before shipping):**
- [ ] `python -m pytest backend -q` — all green
- [ ] `ruff check backend`
- [ ] `cd frontend && npm run build`
- [ ] `docker compose -f infra/docker-compose.yml config --quiet`
- [ ] `docker compose -f infra/docker-compose.yml build`

## Deploy

On any Docker host (small VM is fine for a pilot):

```bash
git clone <repo> && cd connexted
# place the production .env at repo root
VITE_API_BASE_URL=https://api.<domain> docker compose -f infra/docker-compose.yml up -d --build
```

Put the reverse proxy in front (Caddy example):

```
app.<domain> {
    reverse_proxy localhost:8080
}
api.<domain> {
    reverse_proxy localhost:8000
}
```

TLS termination at the proxy; containers speak plain HTTP internally.

## Post-deploy smoke test

1. `curl https://api.<domain>/health` → `{"status":"ok","env":"production"}`
2. `curl https://api.<domain>/api/captures` → **401** (auth enforced)
3. Open the app → `/register`: create the customer's organization + admin account
4. Settings → **Team access**: generate an invite code, open the `/join` link in a private window, create a rep account, sign in
5. Create a test capture as the rep, confirm it reaches **review ready** and is visible only inside this workspace
6. Connect HubSpot from Settings, approve a sync, verify the contact/company/task in the portal
7. Send a WhatsApp message to the Twilio number, confirm a capture appears (lands under the demo identity — see limitations)

## Rollback

Images are immutable; state lives in Supabase and the Redis volume.

```bash
git checkout <last-good-tag>
docker compose -f infra/docker-compose.yml up -d --build
```

Database migrations are additive so far; avoid destructive migrations without a backup (`supabase db dump` first).

## Known limitations (be upfront with pilot customers)

These are accepted for a supervised pilot and on the roadmap:

1. **Org scoping covers the core capture surface.** Enterprise/employee login exists (register → invite → join), and captures are created, listed, and fetched strictly within the signed-in user's organization. Event Radar, social candidates, playbooks, and style profiles are not yet org-partitioned — deploy **one instance per pilot customer** until they are.
2. **WhatsApp intake maps to the demo identity.** The Twilio webhook has no user session; inbound captures land under the demo org rather than the sender's rep account. Phone-number → rep mapping is the planned fix; for the pilot, web capture is the authenticated path.
3. **In-process workflow execution.** Workflows run as FastAPI background tasks, not on the Redis worker (still a placeholder). Run **one backend replica**; a crash mid-workflow leaves a capture `running` — use the capture's **Retry** action.
4. **Template-based generation.** Strategy/drafts come from deterministic templates + playbook context, not yet the LLM agent graph. Output is conservative by design.
5. **No rate limiting or account lockout** beyond what the reverse proxy provides — enable proxy rate limiting on `/api/auth/*` especially before public exposure.

## Monitoring for a pilot

- Uptime: poll `/health` (returns env label) — any uptime service works.
- Container health: both Dockerfiles ship `HEALTHCHECK`s; `docker compose ps` shows status; `restart: unless-stopped` recovers crashes.
- Logs: `docker compose -f infra/docker-compose.yml logs -f backend`.
- Failed workflows surface in-app as `failed` captures with the error on the agent-run trace (`/api/reports/{capture_id}/agent-run`).
