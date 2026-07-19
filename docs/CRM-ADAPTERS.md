# CRM Adapters — Using a CRM Other Than HubSpot

CONNEXTed ships with a HubSpot integration, but the CRM layer is deliberately thin and swappable. This guide explains the architecture, then gives the exact change list for adopting Salesforce, Pipedrive, Zoho, or Dynamics — plus the zero-code fallback if you just want the data out.

## The invariant that never changes

**No CRM write happens without explicit human approval.** The sync endpoint checks `store.has_crm_sync_approval(capture_id)` before touching any CRM. Whatever CRM you adapt to, keep that gate in front of your write path — it is the product's core trust promise.

## Zero-code option: CSV / copy-paste

If you don't want to build an adapter yet, the review flow already supports an `approve_csv_export` action. Reviewed reports contain normalized contact, company, signal, and draft data that can be exported and imported into any CRM's standard CSV importer. For an early pilot this is often enough — build the native adapter once the workflow proves out.

## Architecture: where CRM logic lives

The integration is four small, cleanly separated pieces:

| Layer | File | Responsibility | CRM-specific? |
| --- | --- | --- | --- |
| Provider | `backend/app/providers/hubspot.py` | All network calls: OAuth consent URL, code/token exchange, token refresh, token encryption (Fernet), object creation + association | **Yes — replace this** |
| Routes + mapping | `backend/app/api/crm.py` | `/api/crm/hubspot/{install,callback,status,sync}` endpoints; `_hubspot_payloads()` maps a CONNEXTed report to CRM property dicts | **Yes — adapt this** |
| Persistence | `backend/app/store.py` (`save_crm_connection`, `get_crm_connection`, `update_crm_connection_tokens`, `create_crm_sync`, `has_crm_sync_approval`) | Stores connections and sync jobs. The `crm_connections` table has a `provider` column (default `'hubspot'`) — already CRM-agnostic | No |
| Frontend | `frontend/src/lib/api.js` + `pages/Settings.jsx` (connect button, status) and the report sync action | Calls the routes above | Rename only |
| Config | `backend/app/config.py` + `.env` | `HUBSPOT_*` credentials | **Yes — add yours** |

What flows into the CRM on sync (see `_hubspot_payloads` in `api/crm.py`):
- **Contact**: name (split first/last), email, phone, job title, company name
- **Company**: name, website/domain, industry
- **Follow-up task**: subject, body = next best action / recommended angle, due date (+1 day)
- Associations: contact↔company, task↔contact
- Returned external IDs + a deep link URL are stored on the sync job for the UI

## Concept mapping cheat sheet

| CONNEXTed | HubSpot | Salesforce | Pipedrive | Zoho CRM | Dynamics 365 |
| --- | --- | --- | --- | --- | --- |
| Contact | Contact | Contact/Lead | Person | Contact/Lead | contact |
| Company | Company | Account | Organization | Account | account |
| Follow-up task | Task | Task | Activity | Task | task |
| Association | v4 associations | Lookup fields (`AccountId`, `WhoId`) | `person_id`/`org_id` on the activity | Lookup fields | `@odata.bind` refs |
| Auth | OAuth 2 (refresh token) | OAuth 2 (refresh token) | API token or OAuth 2 | OAuth 2 (refresh token) | OAuth 2 / Azure AD |

## Step-by-step: building an adapter (Salesforce example)

**1. Config** — add to `backend/app/config.py` and `.env.example`:

```python
salesforce_client_id: str | None = None
salesforce_client_secret: str | None = None
salesforce_redirect_uri: str | None = None
crm_token_encryption_key: str | None = None   # or reuse hubspot_token_encryption_key
```

**2. Provider** — create `backend/app/providers/salesforce.py` mirroring `hubspot.py`'s public surface. Keep the same function names so the route layer stays symmetric:

```python
def is_configured(settings) -> bool: ...
def build_authorize_url(settings, state: str) -> str: ...        # login.salesforce.com/services/oauth2/authorize
async def exchange_code(settings, code: str) -> dict: ...        # /services/oauth2/token
async def ensure_access_token(settings, encrypted_blob) -> tuple[str, str | None]: ...
def encrypt_tokens / decrypt_tokens: ...                          # copy the Fernet pattern as-is
async def sync_report(access_token, *, contact, company, task, instance_url) -> dict: ...
```

Salesforce specifics: the token response includes `instance_url` — persist it in the token blob and use it as the API base. Create objects via `POST {instance_url}/services/data/v61.0/sobjects/{Account|Contact|Task}`; associate by setting `AccountId` on the Contact and `WhoId` on the Task (no separate association calls needed).

**3. Payload mapping** — in `api/crm.py`, write a `_salesforce_payloads(report)` beside `_hubspot_payloads`:

```python
contact = {"FirstName": first, "LastName": last or "Unknown", "Email": ..., "Phone": ..., "Title": ...}
company = {"Name": ..., "Website": ..., "Industry": ...}
task    = {"Subject": ..., "Description": ..., "Status": "Not Started", "ActivityDate": due_date}
```

Watch for per-CRM required fields (Salesforce `LastName` is mandatory; Pipedrive wants `name` whole, not split).

**4. Routes** — duplicate the four HubSpot routes as `/api/crm/salesforce/*`, calling your provider. Pass `provider="salesforce"` through `store.save_crm_connection` / `get_crm_connection` (add the parameter — the schema column already exists, the store methods currently hardcode `'hubspot'`). If the new CRM's OAuth endpoints are browser navigations, add them to `_AUTH_EXEMPT_PATHS` in `backend/app/main.py` (redirects can't carry auth headers).

**5. Frontend** — in `lib/api.js` add `salesforceInstallUrl`/`salesforceStatus`/`syncSalesforce` (copy the three HubSpot functions), and point the Settings connect card and the report sync button at them.

**6. Tests** — copy the HubSpot sync test pattern in `backend/tests/test_api.py`: mock the provider functions, assert that sync **without approval returns 400**, and that approved sync stores external IDs.

## Non-OAuth CRMs (API-token style, e.g. Pipedrive)

Simpler: skip install/callback entirely. Add `pipedrive_api_token` to settings, store nothing in `crm_connections` (or a row with `status='connected'` for UI consistency), and have `sync_report` call `https://api.pipedrive.com/v1/{persons|organizations|activities}?api_token=...`. The approval gate and sync-job persistence stay identical.

## Definition of done for a new adapter

- [ ] Sync without an approval decision → 400, nothing created in the CRM
- [ ] Approved sync creates contact + company + task, associated, and the app shows the deep link
- [ ] Tokens/credentials are never stored in plaintext (reuse the Fernet helpers)
- [ ] Token refresh works past the first expiry (for OAuth CRMs)
- [ ] Missing/partial report fields don't crash the mapping (every field is optional except what the CRM requires)
- [ ] CRM outage returns a 502 with a readable message, and the capture/report stays intact for retry
