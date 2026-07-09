alter table public.playbooks
add column products_offered jsonb not null default '[]',
add column target_sectors jsonb not null default '[]',
add column sector_positioning jsonb not null default '[]';
