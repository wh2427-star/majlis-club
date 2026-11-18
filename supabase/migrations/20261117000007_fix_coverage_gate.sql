-- Fix: inside a SECURITY DEFINER function current_user is the owner, so is_trusted_caller()
-- was always true and non-admins could read coverage. Gate on the caller's JWT instead.
create or replace function public.cluster_coverage()
returns table (cluster_id uuid, slug text, name text, status public.area_status,
               listed bigint, identified integer, waitlist bigint)
language sql stable security definer set search_path = '' as $$
  select cl.id, cl.slug, cl.name, cl.status,
    (select count(*) from public.clubs c join public.areas a on a.id = c.area_id
      where a.cluster_id = cl.id and c.status = 'approved'),
    cl.identified_clubs,
    (select count(*) from public.waitlist w join public.areas a on a.id = w.area_id where a.cluster_id = cl.id)
  from public.clusters cl
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  order by cl.sort;
$$;
