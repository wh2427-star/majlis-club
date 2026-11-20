-- Demo round step 2: venues, groups, price plans and free trials.
-- A club has venues; a venue has groups (an age range); a group has sessions (times) and price plans.
-- Club-wide plans have no group. Trial requests keep a snapshot so clubs never read parent tables.

create type public.price_plan_kind as enum ('per_session', 'per_term', 'per_year', 'block');
create type public.trial_status as enum ('requested', 'accepted', 'declined');

-- Venues -------------------------------------------------------------------

create table public.club_venues (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  area_id uuid not null references public.areas(id),
  lat double precision not null,
  lng double precision not null,
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);
create index club_venues_club_idx on public.club_venues(club_id);

create table public.club_groups (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  venue_id uuid not null references public.club_venues(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  age_min smallint not null check (age_min between 2 and 18),
  age_max smallint not null check (age_max between 2 and 18),
  sort smallint not null default 0,
  check (age_max >= age_min)
);
create index club_groups_club_idx on public.club_groups(club_id);
create index club_groups_venue_idx on public.club_groups(venue_id);

-- Sessions belong to a group; ages are copied from the group by save_club_schedule.
alter table public.club_sessions
  alter column price_aed drop not null,
  add column trial_available boolean not null default false,
  add column group_id uuid references public.club_groups(id) on delete cascade;

-- Price plans ---------------------------------------------------------------

create table public.club_price_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  group_id uuid references public.club_groups(id) on delete cascade,
  kind public.price_plan_kind not null,
  price_aed numeric(8, 2) not null check (price_aed between 0 and 100000),
  sessions_count smallint,
  label text not null default '' check (char_length(label) <= 40),
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  -- "is not null" matters: a check that evaluates to null passes
  constraint club_price_plans_sessions_count check (
    (kind in ('per_session', 'per_year') and sessions_count is null)
    or (kind = 'per_term' and sessions_count is not null and sessions_count between 1 and 100)
    or (kind = 'block' and sessions_count is not null and sessions_count between 5 and 10)
  )
);
create index club_price_plans_club_idx on public.club_price_plans(club_id);

-- Backfill: one venue per club at the club's location, named after its area; one group per age range;
-- existing session prices become club-wide per-session plans.
insert into public.club_venues (club_id, name, area_id, lat, lng)
select c.id, a.name, c.area_id, c.lat, c.lng from public.clubs c join public.areas a on a.id = c.area_id;

insert into public.club_groups (club_id, venue_id, age_min, age_max)
select distinct s.club_id, v.id, s.age_min, s.age_max
from public.club_sessions s join public.club_venues v on v.club_id = s.club_id;

update public.club_sessions s set group_id = g.id
from public.club_groups g
where g.club_id = s.club_id and g.age_min = s.age_min and g.age_max = s.age_max;

alter table public.club_sessions alter column group_id set not null;
create index club_sessions_group_idx on public.club_sessions(group_id);

insert into public.club_price_plans (club_id, kind, price_aed)
select distinct club_id, 'per_session'::public.price_plan_kind, price_aed from public.club_sessions where price_aed is not null;

-- Trial requests -------------------------------------------------------------

create table public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  -- sessions are replaced when a club saves its schedule; the snapshot below keeps the request readable
  session_id uuid references public.club_sessions(id) on delete set null,
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_nickname text not null check (char_length(btrim(child_nickname)) between 1 and 30),
  child_birth_year smallint not null check (child_birth_year between 2000 and 2100),
  contact_name text not null check (char_length(contact_name) between 1 and 80),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  contact_consent_at timestamptz not null,
  sport_id uuid references public.sports(id),
  venue_name text not null check (char_length(venue_name) <= 80),
  session_day smallint not null check (session_day between 0 and 6),
  session_start time not null,
  preferred_date date not null,
  status public.trial_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trial_requests_club_idx on public.trial_requests(club_id, created_at);
create index trial_requests_parent_idx on public.trial_requests(parent_id);
create unique index trial_requests_one_open on public.trial_requests (parent_id, session_id) where status = 'requested';

-- Parents create requests as themselves with status 'requested'; clubs may only accept or decline.
-- The seed runs as the service role (auth.uid() is null) and may set any column; anon has no write grant.
create or replace function public.guard_trial_requests()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'requested';
    new.parent_id := auth.uid();
    return new;
  end if;
  if row(new.club_id, coalesce(new.session_id, old.session_id), new.parent_id, new.child_nickname, new.child_birth_year, new.contact_name,
         new.contact_email, new.contact_consent_at, new.sport_id, new.venue_name, new.session_day, new.session_start,
         new.preferred_date, new.created_at)
     is distinct from
     row(old.club_id, old.session_id, old.parent_id, old.child_nickname, old.child_birth_year, old.contact_name,
         old.contact_email, old.contact_consent_at, old.sport_id, old.venue_name, old.session_day, old.session_start,
         old.preferred_date, old.created_at) then
    raise exception 'trial request content is read-only' using errcode = '42501';
  end if;
  -- a session_id may only change by becoming null (the session was deleted by a schedule save)
  if new.session_id is not null and new.session_id is distinct from old.session_id then
    raise exception 'trial request content is read-only' using errcode = '42501';
  end if;
  if new.status is distinct from old.status
     and not (old.status = 'requested' and new.status in ('accepted', 'declined')) then
    raise exception 'a trial request can only be accepted or declined once' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.guard_trial_requests() from public, anon, authenticated;

create trigger guard_trial_requests before insert or update on public.trial_requests
  for each row execute function public.guard_trial_requests();
create trigger touch_trial_requests before update on public.trial_requests
  for each row execute function public.touch_updated_at();

-- Row-level security ----------------------------------------------------------

alter table public.club_venues enable row level security;
alter table public.club_groups enable row level security;
alter table public.club_price_plans enable row level security;
alter table public.trial_requests enable row level security;

create policy "read venues" on public.club_venues for select
  using (public.club_is_public(club_id) or public.is_club_member(club_id) or public.is_admin());
create policy "members write venues" on public.club_venues for all to authenticated
  using (public.is_club_member(club_id) or public.is_admin()) with check (public.is_club_member(club_id) or public.is_admin());

create policy "read groups" on public.club_groups for select
  using (public.club_is_public(club_id) or public.is_club_member(club_id) or public.is_admin());
create policy "members write groups" on public.club_groups for all to authenticated
  using (public.is_club_member(club_id) or public.is_admin()) with check (public.is_club_member(club_id) or public.is_admin());

create policy "read price plans" on public.club_price_plans for select
  using (public.club_is_public(club_id) or public.is_club_member(club_id) or public.is_admin());
create policy "members write price plans" on public.club_price_plans for all to authenticated
  using (public.is_club_member(club_id) or public.is_admin()) with check (public.is_club_member(club_id) or public.is_admin());

create policy "parent or club reads trial requests" on public.trial_requests for select to authenticated
  using (parent_id = auth.uid() or public.is_club_member(club_id) or public.is_admin());
create policy "parent requests a trial" on public.trial_requests for insert to authenticated
  with check (
    parent_id = auth.uid()
    and public.club_is_public(club_id)
    and contact_consent_at is not null
    and preferred_date between current_date and current_date + 60
    and exists (
      select 1 from public.club_sessions s
      where s.id = session_id and s.club_id = trial_requests.club_id and s.trial_available
    )
  );
create policy "club answers trial requests" on public.trial_requests for update to authenticated
  using (public.is_club_member(club_id)) with check (public.is_club_member(club_id));

grant select on public.club_venues, public.club_groups, public.club_price_plans to anon, authenticated;
grant insert, update, delete on public.club_venues, public.club_groups, public.club_price_plans to authenticated;
grant select, insert, update on public.trial_requests to authenticated;
grant all on public.club_venues, public.club_groups, public.club_price_plans, public.trial_requests to service_role;

-- Atomic schedule save ----------------------------------------------------------
-- Replaces a club's venues, groups, sessions and plans in one transaction. Runs as the caller, so RLS
-- and the table checks still apply; any failure leaves the previous schedule untouched.
create or replace function public.save_club_schedule(p_club uuid, p_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v jsonb; g jsonb; s jsonb; p jsonb;
  v_id uuid; g_id uuid;
  v_sort int := 0; g_sort int; p_sort int;
begin
  if not (public.is_club_member(p_club) or public.is_admin()) then
    raise exception 'not a member of this club' using errcode = '42501';
  end if;

  delete from public.club_price_plans where club_id = p_club;
  delete from public.club_sessions where club_id = p_club;
  delete from public.club_groups where club_id = p_club;
  delete from public.club_venues where club_id = p_club;

  p_sort := 0;
  for p in select * from jsonb_array_elements(coalesce(p_payload -> 'plans', '[]'::jsonb)) loop
    insert into public.club_price_plans (club_id, kind, price_aed, sessions_count, label, sort)
    values (p_club, (p ->> 'kind')::public.price_plan_kind, (p ->> 'priceAed')::numeric,
            nullif(p ->> 'sessionsCount', '')::smallint, coalesce(p ->> 'label', ''), p_sort);
    p_sort := p_sort + 1;
  end loop;

  for v in select * from jsonb_array_elements(coalesce(p_payload -> 'venues', '[]'::jsonb)) loop
    -- A venue sits at its area's centre; coordinates from the caller are ignored so nobody can rank
    -- as nearer than they are (fair order). A precise map pin, checked against the area, comes later.
    insert into public.club_venues (club_id, name, area_id, lat, lng, sort)
    select p_club, v ->> 'name', a.id, a.lat, a.lng, v_sort
    from public.areas a where a.id = (v ->> 'areaId')::uuid
    returning id into v_id;
    if v_id is null then
      raise exception 'unknown area' using errcode = '23503';
    end if;
    v_sort := v_sort + 1;
    g_sort := 0;
    for g in select * from jsonb_array_elements(coalesce(v -> 'groups', '[]'::jsonb)) loop
      insert into public.club_groups (club_id, venue_id, name, age_min, age_max, sort)
      values (p_club, v_id, coalesce(g ->> 'name', ''), (g ->> 'ageMin')::smallint, (g ->> 'ageMax')::smallint, g_sort)
      returning id into g_id;
      g_sort := g_sort + 1;
      for s in select * from jsonb_array_elements(coalesce(g -> 'sessions', '[]'::jsonb)) loop
        insert into public.club_sessions (club_id, group_id, sport_id, day, start_time, end_time, age_min, age_max, trial_available)
        values (p_club, g_id, (s ->> 'sportId')::uuid, (s ->> 'day')::smallint, (s ->> 'start')::time, (s ->> 'end')::time,
                (g ->> 'ageMin')::smallint, (g ->> 'ageMax')::smallint, coalesce((s ->> 'trialAvailable')::boolean, false));
      end loop;
      p_sort := 0;
      for p in select * from jsonb_array_elements(coalesce(g -> 'plans', '[]'::jsonb)) loop
        insert into public.club_price_plans (club_id, group_id, kind, price_aed, sessions_count, label, sort)
        values (p_club, g_id, (p ->> 'kind')::public.price_plan_kind, (p ->> 'priceAed')::numeric,
                nullif(p ->> 'sessionsCount', '')::smallint, coalesce(p ->> 'label', ''), p_sort);
        p_sort := p_sort + 1;
      end loop;
    end loop;
  end loop;
end $$;

revoke execute on function public.save_club_schedule(uuid, jsonb) from public, anon;
grant execute on function public.save_club_schedule(uuid, jsonb) to authenticated;
