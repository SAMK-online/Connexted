create table public.social_intent_discoveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_user_id uuid,
  event_name text not null,
  platforms jsonb not null default '[]',
  hashtags jsonb not null default '[]',
  keywords jsonb not null default '[]',
  organizer_handles jsonb not null default '[]',
  sponsor_names jsonb not null default '[]',
  location text,
  date_start date,
  date_end date,
  post_links jsonb not null default '[]',
  pasted_posts text not null default '',
  max_posts integer not null default 10,
  status text not null default 'completed',
  warnings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.social_post_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_intent_discovery_id uuid references public.social_intent_discoveries(id) on delete cascade,
  event_name text not null,
  platform text not null,
  author_name text,
  author_handle text,
  author_profile_url text,
  author_company text,
  author_title text,
  post_text text not null,
  post_url text,
  posted_at timestamptz,
  evidence jsonb not null default '[]',
  classification text not null,
  confidence public.confidence_label not null default 'low',
  relevance_reason text not null,
  suggested_angle text not null,
  source_query text,
  inferred boolean not null default true,
  status text not null default 'prospective',
  converted_capture_id uuid references public.captures(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_intent_discoveries_org_event_idx
  on public.social_intent_discoveries (organization_id, event_name, created_at desc);

create index social_post_candidates_org_event_idx
  on public.social_post_candidates (organization_id, event_name, created_at desc);

create index social_post_candidates_status_idx
  on public.social_post_candidates (organization_id, status, created_at desc);

alter table public.social_intent_discoveries enable row level security;
alter table public.social_post_candidates enable row level security;

create policy "org members read social intent discoveries"
on public.social_intent_discoveries for select
using (public.is_org_member(organization_id));

create policy "org members read social post candidates"
on public.social_post_candidates for select
using (public.is_org_member(organization_id));
