create table public.event_discoveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_user_id uuid,
  industry text not null,
  region text,
  date_start date,
  date_end date,
  personas jsonb not null default '[]',
  verticals jsonb not null default '[]',
  keywords jsonb not null default '[]',
  max_events integer not null default 5,
  status text not null default 'completed',
  warnings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_discovery_id uuid not null references public.event_discoveries(id) on delete cascade,
  name text not null,
  event_type text not null,
  location text,
  starts_on date,
  ends_on date,
  website_url text,
  relevance_summary text not null,
  fit_reasons jsonb not null default '[]',
  confidence public.confidence_label not null default 'medium',
  status text not null default 'recommended',
  saved_by uuid,
  saved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  source_type text not null,
  title text,
  url text,
  snippet text,
  retrieved_at timestamptz not null default now(),
  confidence public.confidence_label not null default 'medium',
  metadata jsonb not null default '{}'
);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  title text,
  company text,
  attendee_role text not null,
  relevance_reason text not null,
  suggested_angle text not null,
  confidence public.confidence_label not null default 'medium',
  source_ids uuid[] not null default '{}',
  inferred boolean not null default false,
  status text not null default 'recommended',
  created_at timestamptz not null default now()
);

create table public.event_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  rep_user_id uuid,
  recommendation_rank integer not null,
  score_label public.confidence_label not null default 'medium',
  reasons jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.event_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_attendee_id uuid not null references public.event_attendees(id) on delete cascade,
  channel text not null,
  subject text,
  body text not null,
  inferred_claims_used boolean not null default false,
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_discoveries_org_created_idx
  on public.event_discoveries (organization_id, created_at desc);

create index events_org_created_idx
  on public.events (organization_id, created_at desc);

create index event_attendees_event_idx
  on public.event_attendees (event_id);

create index event_outreach_drafts_event_idx
  on public.event_outreach_drafts (event_id);

alter table public.event_discoveries enable row level security;
alter table public.events enable row level security;
alter table public.event_sources enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_recommendations enable row level security;
alter table public.event_outreach_drafts enable row level security;

create policy "org members read event discoveries"
on public.event_discoveries for select
using (public.is_org_member(organization_id));

create policy "org members read events"
on public.events for select
using (public.is_org_member(organization_id));

create policy "org members read event sources"
on public.event_sources for select
using (public.is_org_member(organization_id));

create policy "org members read event attendees"
on public.event_attendees for select
using (public.is_org_member(organization_id));

create policy "org members read event recommendations"
on public.event_recommendations for select
using (public.is_org_member(organization_id));

create policy "org members read event outreach drafts"
on public.event_outreach_drafts for select
using (public.is_org_member(organization_id));
