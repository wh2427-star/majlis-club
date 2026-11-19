-- Club home: coach credentials, age-group labels, primary sport, and a save count for club members.

alter table public.clubs
  add column primary_sport_id uuid references public.sports(id),
  add column coach_credentials text not null default '' check (char_length(coach_credentials) <= 200),
  -- labels shown to parents only; never read by search or ranking
  add column age_groups text[] not null default '{}' check (age_groups <@ array['3-5', '6-8', '9-12', '13+']::text[]);

-- Backfill: each club's alphabetically first sport.
update public.clubs c
set primary_sport_id = (
  select s.id from public.club_sports cs join public.sports s on s.id = cs.sport_id
  where cs.club_id = c.id order by s.slug limit 1
);

-- Clubs never read saved_clubs (parent data). Members and admins get the count only.
create or replace function public.club_save_count(p_club uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_club_member(p_club) or public.is_admin()
      then (select count(*)::integer from public.saved_clubs where club_id = p_club)
    else null
  end;
$$;

revoke execute on function public.club_save_count(uuid) from public, anon;
grant execute on function public.club_save_count(uuid) to authenticated;
