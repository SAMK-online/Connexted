alter table public.playbooks
add column target_personas jsonb not null default '[]',
add column negative_signals jsonb not null default '[]',
add column priority_signals jsonb not null default '[]',
add column trusted_sources jsonb not null default '[]',
add column competitors jsonb not null default '[]',
add column proof_points jsonb not null default '[]',
add column personalization_rules jsonb not null default '[]',
add column research_freshness_days integer not null default 90;

alter table public.playbooks
add constraint playbooks_research_freshness_days_check
check (research_freshness_days between 1 and 3650);
