create table public.event_site_deep_dives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_user_id uuid,
  event_name text not null,
  event_url text,
  site_text text not null default '',
  roles jsonb not null default '[]',
  max_visitors integer not null default 20,
  status text not null default 'completed',
  warnings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.event_site_visitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_site_deep_dive_id uuid references public.event_site_deep_dives(id) on delete cascade,
  event_name text not null,
  name text not null,
  title text,
  company text,
  visitor_role text not null,
  source_url text,
  source_label text not null default 'Event site',
  evidence jsonb not null default '[]',
  confidence public.confidence_label not null default 'medium',
  relevance_reason text not null,
  suggested_angle text not null,
  inferred boolean not null default false,
  status text not null default 'confirmed',
  converted_capture_id uuid references public.captures(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_site_deep_dives_org_event_idx
  on public.event_site_deep_dives (organization_id, event_name, created_at desc);

create index event_site_visitors_org_event_idx
  on public.event_site_visitors (organization_id, event_name, created_at desc);

create index event_site_visitors_status_idx
  on public.event_site_visitors (organization_id, status, created_at desc);

alter table public.event_site_deep_dives enable row level security;
alter table public.event_site_visitors enable row level security;

create policy "org members read event site deep dives"
on public.event_site_deep_dives for select
using (public.is_org_member(organization_id));

create policy "org members read event site visitors"
on public.event_site_visitors for select
using (public.is_org_member(organization_id));
