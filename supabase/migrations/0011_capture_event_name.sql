alter table public.captures
add column event_name text;

create index captures_event_name_created_idx
on public.captures (organization_id, event_name, created_at desc)
where deleted_at is null;
