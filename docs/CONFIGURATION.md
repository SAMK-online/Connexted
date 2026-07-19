# Configuration Reference

All configuration is environment-driven. The backend loads the repo-root `.env` (see `backend/app/config.py`); the frontend reads `VITE_*` variables **at build time** (Vite bakes them into the bundle — changing them requires a rebuild).

## Core switches

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | Reported by `/health`; label only |
| `MOCK_PROVIDERS` | `true` | Master switch. `true` = all providers return deterministic mock data. `false` = live provider calls where keys are configured, plus Twilio webhook signature validation |
| `PERSISTENCE_BACKEND` | `memory` | `memory` (resets on restart) or `postgres` (Supabase/Postgres via `DATABASE_URL`) |
| `AUTH_REQUIRED` | `false` | **User auth.** When `true`, every `/api/*` call needs a signed-in user session (JWT from register/login/join). Set `true` in production |
| `AUTH_JWT_SECRET` | *(empty)* | Secret signing session JWTs. **Required in production** — without it a random per-process secret is used and sessions die on restart. Generate: `openssl rand -hex 32` |
| `AUTH_TOKEN_TTL_HOURS` | `72` | Session lifetime |
| `API_AUTH_TOKEN` | *(empty)* | Optional legacy shared secret for service/script access (`Authorization: Bearer` or `X-API-Key`). User sessions supersede it; keep it for CI/scripts or leave empty |

Auth flow: `POST /api/auth/register` creates an organization + admin account; admins mint invite codes (`POST /api/auth/invite`, also from **Settings → Team access**); employees create rep accounts at `/join` with the code; everyone signs in at `/login`. Captures are scoped to the signed-in user's organization. Always-open endpoints: `/health`, `/webhooks/*` (Twilio-signature-protected), auth entry points, and the HubSpot OAuth redirects. The `app_users`/`org_invites` tables ship in migration `0015_auth_accounts.sql`.
| `API_BASE_URL` | `http://localhost:8000` | Public URL of the backend (used in generated links) |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowlist; comma-separated for multiple origins |

## Frontend (build-time)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend URL the browser calls |
| `VITE_API_AUTH_TOKEN` | Must equal `API_AUTH_TOKEN` when set. Note: this token is visible to anyone with access to the app bundle — it gates casual access, it is not per-user auth (see limitations in the [Deployment Runbook](DEPLOYMENT.md)) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Reserved for Supabase Auth/Realtime |

Local override file: `frontend/.env.local`.

## Persistence (Supabase / Postgres)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://...` connection string. Local Supabase: port `54322`; hosted Supabase: use the **connection pooler** string |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | Reserved for Supabase Auth/Storage/Realtime integration |

Schema lives in `supabase/migrations/` (14 migrations incl. RLS policies). Apply with `supabase db push`.

## Provider matrix — mock → live

Each provider goes live independently once `MOCK_PROVIDERS=false` **and** its keys are set. Missing keys degrade gracefully to mock/skip with a warning on the report.

| Capability | Provider | Variables | Notes |
| --- | --- | --- | --- |
| WhatsApp intake | Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Point the Twilio WhatsApp webhook at `POST <API_BASE_URL>/webhooks/twilio/whatsapp`. Signature validation is enforced when `MOCK_PROVIDERS=false` |
| Business-card OCR | Google Vision | `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service-account JSON. Mock mode parses pasted text instead |
| Web research | Tavily | `TAVILY_API_KEY` | Event discovery + company research |
| Contact/company enrichment | Prospeo | `PROSPEO_API_KEY`, `PROSPEO_BASE_URL`, `PROSPEO_ENRICH_MOBILE`, `PROSPEO_ONLY_VERIFIED_EMAIL` | Verified-email-only is the safe default |
| Social intent radar | X (Twitter) | `X_BEARER_TOKEN`, `X_API_BASE_URL` | Public post discovery |
| LLM generation | Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | The current workflow generates strategy/drafts from deterministic templates + playbook context; these keys are reserved for the LangGraph agent upgrade |
| CRM sync | HubSpot | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`, `HUBSPOT_SCOPES`, `HUBSPOT_TOKEN_ENCRYPTION_KEY` | OAuth app credentials; see below. Different CRM? See [CRM Adapters](CRM-ADAPTERS.md) |
| Job queue | Redis | `REDIS_URL` | Provisioned in compose; the dedicated worker is still a placeholder (workflows run in-process) |

## HubSpot setup

1. Create a HubSpot app (developer account) with the four scopes in `HUBSPOT_SCOPES`.
2. Set the app's redirect URL to `<API_BASE_URL>/api/crm/hubspot/callback` and put the same value in `HUBSPOT_REDIRECT_URI`.
3. Generate a Fernet key for token encryption at rest:
   `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
   → `HUBSPOT_TOKEN_ENCRYPTION_KEY`.
4. In the app: **Settings → Connect HubSpot** starts the OAuth flow; tokens are encrypted and stored per organization; access tokens auto-refresh.
5. Sync is only possible after a human approves it on a report (`approve_crm_sync` review action). It creates a Contact, a Company, and a follow-up Task, associated together.

## Secret handling rules

- `.env` is git-ignored; only `.env.example` (placeholders) is committed.
- CRM OAuth tokens are Fernet-encrypted before they touch the database.
- Never put real keys in `frontend/.env.local` other than `VITE_API_AUTH_TOKEN`/URLs — everything `VITE_*` ships to the browser.
