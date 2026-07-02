create table public.playbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  icp_segments jsonb not null default '[]',
  disqualifiers jsonb not null default '[]',
  value_props jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.style_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  tone text not null,
  banned_phrases jsonb not null default '[]',
  cta_style text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create unique index playbooks_one_default_per_org_idx
  on public.playbooks (organization_id)
  where is_default;

create unique index style_profiles_one_default_per_org_idx
  on public.style_profiles (organization_id)
  where is_default;

create index playbooks_org_created_idx
  on public.playbooks (organization_id, created_at asc);

create index style_profiles_org_created_idx
  on public.style_profiles (organization_id, created_at asc);

alter table public.playbooks enable row level security;
alter table public.style_profiles enable row level security;

create policy "org members manage playbooks"
on public.playbooks for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "org members manage style profiles"
on public.style_profiles for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));
