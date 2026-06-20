create extension if not exists "pgcrypto";
create extension if not exists "vector";

create type public.member_role as enum ('rep', 'manager', 'admin');
create type public.capture_status as enum ('queued', 'running', 'review_ready', 'needs_input', 'failed');
create type public.confidence_label as enum ('high', 'medium', 'low');
create type public.review_action as enum (
  'approve',
  'reject',
  'request_changes',
  'approve_crm_sync',
  'approve_csv_export',
  'approve_merge'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.member_role not null default 'rep',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.rep_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  whatsapp_sender text,
  hubspot_owner_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_user_id uuid,
  source text not null default 'whatsapp',
  status public.capture_status not null default 'queued',
  raw_text text not null default '',
  prospect_name text,
  company_name text,
  notes text,
  external_message_id text,
  dedupe_key text,
  warnings jsonb not null default '[]',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);

create table public.capture_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  storage_path text not null,
  content_type text,
  media_url text,
  ocr_status text not null default 'pending',
  raw_ocr_text text,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  headquarters text,
  confidence public.confidence_label not null default 'medium',
  confidence_reasons jsonb not null default '[]',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text,
  title text,
  email text,
  phone text,
  linkedin_url text,
  confidence public.confidence_label not null default 'medium',
  confidence_reasons jsonb not null default '[]',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_company_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text,
  department text,
  seniority text,
  source text,
  created_at timestamptz not null default now()
);

create table public.merge_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid references public.captures(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  field_name text not null,
  existing_value text,
  proposed_value text,
  source text,
  confidence public.confidence_label not null default 'medium',
  status text not null default 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  status text not null default 'running',
  graph_thread_id text,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  name text not null,
  status text not null,
  input_summary text,
  output_summary text,
  rationale text,
  tool_calls jsonb not null default '[]',
  retry_count integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.enrichment_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid references public.captures(id) on delete cascade,
  source_type text not null,
  title text,
  url text,
  snippet text,
  retrieved_at timestamptz not null default now(),
  confidence public.confidence_label not null default 'medium',
  is_personal_social boolean not null default false,
  metadata jsonb not null default '{}'
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  signal_type text not null,
  summary text not null,
  confidence public.confidence_label not null,
  reasons jsonb not null default '[]',
  source_ids uuid[] not null default '{}',
  inferred boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  contact_snapshot jsonb not null,
  company_snapshot jsonb not null,
  strategy jsonb not null,
  warnings jsonb not null default '[]',
  confidence public.confidence_label not null default 'medium',
  created_at timestamptz not null default now()
);

create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  channel text not null,
  draft_type text not null,
  subject text,
  body text not null,
  version integer not null default 1,
  inferred_claims_used boolean not null default false,
  inferred_claim_notes jsonb not null default '[]',
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action public.review_action not null,
  reviewer_id uuid,
  reason text,
  final_content jsonb,
  created_at timestamptz not null default now()
);

create table public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  requester_id uuid,
  instruction text not null,
  rerun_scope text not null default 'strategy_and_drafts',
  created_at timestamptz not null default now()
);

create table public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'hubspot',
  external_account_id text,
  encrypted_token_ref text,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  requested_by uuid,
  status text not null default 'queued',
  target_objects jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_sync_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crm_sync_job_id uuid not null references public.crm_sync_jobs(id) on delete cascade,
  provider text not null default 'hubspot',
  external_ids jsonb not null default '{}',
  field_diffs jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now()
);

create table public.memory_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  title text not null,
  metadata jsonb not null default '{}',
  approved_by uuid,
  created_at timestamptz not null default now()
);

create table public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  memory_document_id uuid not null references public.memory_documents(id) on delete cascade,
  content text not null,
  tags jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  memory_chunk_id uuid not null references public.memory_chunks(id) on delete cascade,
  embedding vector(1536) not null,
  embedding_model text not null,
  created_at timestamptz not null default now()
);

create index captures_org_status_idx on public.captures (organization_id, status, created_at desc);
create index reports_capture_idx on public.reports (capture_id);
create index drafts_capture_idx on public.outreach_drafts (capture_id);
create index signals_capture_idx on public.signals (capture_id);
create index memory_embeddings_vector_idx on public.memory_embeddings using ivfflat (embedding vector_cosine_ops);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.rep_profiles enable row level security;
alter table public.captures enable row level security;
alter table public.capture_assets enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_company_roles enable row level security;
alter table public.merge_suggestions enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.agent_events enable row level security;
alter table public.enrichment_sources enable row level security;
alter table public.signals enable row level security;
alter table public.reports enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.review_decisions enable row level security;
alter table public.feedback_requests enable row level security;
alter table public.crm_connections enable row level security;
alter table public.crm_sync_jobs enable row level security;
alter table public.crm_sync_results enable row level security;
alter table public.memory_documents enable row level security;
alter table public.memory_chunks enable row level security;
alter table public.memory_embeddings enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where memberships.organization_id = org_id
      and memberships.user_id = auth.uid()
  );
$$;

create or replace function public.match_memory_chunks(
  query_embedding vector(1536),
  match_organization_id uuid,
  match_count integer default 10
)
returns table (
  memory_chunk_id uuid,
  content text,
  tags jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    memory_chunks.id,
    memory_chunks.content,
    memory_chunks.tags,
    1 - (memory_embeddings.embedding <=> query_embedding) as similarity
  from public.memory_embeddings
  join public.memory_chunks on memory_chunks.id = memory_embeddings.memory_chunk_id
  where memory_embeddings.organization_id = match_organization_id
    and public.is_org_member(match_organization_id)
  order by memory_embeddings.embedding <=> query_embedding
  limit match_count;
$$;

create policy "members can read their memberships"
on public.memberships for select
using (user_id = auth.uid() or public.is_org_member(organization_id));

create policy "members can read organizations"
on public.organizations for select
using (public.is_org_member(id));

create policy "org members read captures"
on public.captures for select
using (public.is_org_member(organization_id));

create policy "org members read reports"
on public.reports for select
using (public.is_org_member(organization_id));

create policy "org members read drafts"
on public.outreach_drafts for select
using (public.is_org_member(organization_id));

create policy "org members read workflow"
on public.agent_runs for select
using (public.is_org_member(organization_id));

create policy "org members read workflow steps"
on public.agent_steps for select
using (public.is_org_member(organization_id));

create policy "org members read sources"
on public.enrichment_sources for select
using (public.is_org_member(organization_id));

create policy "org members read signals"
on public.signals for select
using (public.is_org_member(organization_id));

create policy "org members read reviews"
on public.review_decisions for select
using (public.is_org_member(organization_id));

create policy "org members read memory"
on public.memory_documents for select
using (public.is_org_member(organization_id));

create policy "org members read memory chunks"
on public.memory_chunks for select
using (public.is_org_member(organization_id));

create policy "org members read memory embeddings"
on public.memory_embeddings for select
using (public.is_org_member(organization_id));

