create schema if not exists extensions;

alter extension vector set schema extensions;

alter function public.match_memory_chunks(vector, uuid, integer)
set search_path = public, extensions;

revoke execute on function public.is_org_member(uuid) from anon, authenticated;

create policy "org members read rep profiles"
on public.rep_profiles for select
using (public.is_org_member(organization_id));

create policy "org members read capture assets"
on public.capture_assets for select
using (public.is_org_member(organization_id));

create policy "org members read companies"
on public.companies for select
using (public.is_org_member(organization_id));

create policy "org members read contacts"
on public.contacts for select
using (public.is_org_member(organization_id));

create policy "org members read contact company roles"
on public.contact_company_roles for select
using (public.is_org_member(organization_id));

create policy "org members read merge suggestions"
on public.merge_suggestions for select
using (public.is_org_member(organization_id));

create policy "org members read agent events"
on public.agent_events for select
using (public.is_org_member(organization_id));

create policy "org members read feedback requests"
on public.feedback_requests for select
using (public.is_org_member(organization_id));

create policy "org members read crm connections"
on public.crm_connections for select
using (public.is_org_member(organization_id));

create policy "org members read crm sync jobs"
on public.crm_sync_jobs for select
using (public.is_org_member(organization_id));

create policy "org members read crm sync results"
on public.crm_sync_results for select
using (public.is_org_member(organization_id));
