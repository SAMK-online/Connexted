alter table public.playbooks
add column research_resources jsonb not null default '[]',
add column research_instructions text not null default '';
