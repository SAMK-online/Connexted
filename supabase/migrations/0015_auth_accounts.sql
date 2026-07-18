-- Native enterprise + employee accounts (email/password with backend-issued JWTs).
-- The backend connects with the service role; RLS is enabled with no public
-- policies so these tables are never readable through the anon/client APIs.

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role public.member_role not null default 'rep',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index app_users_organization_idx on public.app_users (organization_id);

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null unique,
  created_by uuid references public.app_users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index org_invites_organization_idx on public.org_invites (organization_id);

alter table public.app_users enable row level security;
alter table public.org_invites enable row level security;
