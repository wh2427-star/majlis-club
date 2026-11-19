-- Six weekly profile-view counts for a club, oldest week first. Counted in the database so
-- busy clubs are never undercounted by the API row cap. Members and admins only; null otherwise.
-- Week i (0 = oldest) covers [now − (6−i)·7d, now − (5−i)·7d).
create or replace function public.club_weekly_views(p_club uuid)
returns integer[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_club_member(p_club) or public.is_admin() then (
      select array_agg(coalesce(c.n, 0)::integer order by w.i)
      from generate_series(0, 5) as w(i)
      left join (
        select 5 - floor(extract(epoch from (now() - e.created_at)) / 604800)::integer as i, count(*) as n
        from public.club_events e
        where e.club_id = p_club and e.kind = 'view'
          and e.created_at > now() - interval '42 days' and e.created_at <= now()
        group by 1
      ) c on c.i = w.i
    )
    else null
  end;
$$;

revoke execute on function public.club_weekly_views(uuid) from public, anon;
grant execute on function public.club_weekly_views(uuid) to authenticated;
