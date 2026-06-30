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
      and memberships.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_org_member(uuid) from public;

drop policy if exists "members can read their memberships" on public.memberships;

create policy "members can read their memberships"
on public.memberships for select
using (user_id = (select auth.uid()) or public.is_org_member(organization_id));

do $$
declare
  fk record;
begin
  for fk in
    select
      constraint_table.oid::regclass as table_name,
      constraint_table.relname as relation_name,
      constraint_info.conname as constraint_name,
      string_agg(format('%I', columns.attname), ', ' order by key_columns.ordinality) as column_list
    from pg_constraint constraint_info
    join pg_class constraint_table
      on constraint_table.oid = constraint_info.conrelid
    join pg_namespace constraint_schema
      on constraint_schema.oid = constraint_table.relnamespace
    join unnest(constraint_info.conkey) with ordinality as key_columns(attnum, ordinality)
      on true
    join pg_attribute columns
      on columns.attrelid = constraint_info.conrelid
      and columns.attnum = key_columns.attnum
    where constraint_info.contype = 'f'
      and constraint_schema.nspname = 'public'
      and constraint_table.relname not in ('personas', 'runs')
    group by constraint_table.oid, constraint_table.relname, constraint_info.conname
  loop
    execute format(
      'create index if not exists %I on %s (%s)',
      fk.relation_name || '_' || fk.constraint_name || '_idx',
      fk.table_name,
      fk.column_list
    );
  end loop;
end $$;
