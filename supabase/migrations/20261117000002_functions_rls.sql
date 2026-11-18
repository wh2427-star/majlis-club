-- Helper functions, triggers and row-level security for every table.

-- Helpers -----------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_club_member(p_club uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.club_members where club_id = p_club and user_id = auth.uid());
$$;

create or replace function public.club_is_public(p_club uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clubs c join public.areas a on a.id = c.area_id
    where c.id = p_club and c.status = 'approved'
  );
$$;

-- Trusted callers: table owner (migrations, security-definer functions) or the service role.
create or replace function public.is_trusted_caller()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role')
      or coalesce(auth.role(), '') = 'service_role';
$$;

-- Great-circle distance in km (Haversine). Mirrors lib/domain/distance.ts.
create or replace function public.haversine_km(lat1 double precision, lng1 double precision,
                                               lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371.0088 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Badges: booleans only, so the public never reads licence rows.
-- "Licence verified" = an approved licence that has not expired.
create or replace function public.club_badges()
returns table (club_id uuid, licence_verified boolean, trial_offer boolean, featured_area_ids uuid[])
language sql stable security definer set search_path = '' as $$
  select c.id,
    exists (select 1 from public.licences l
            where l.club_id = c.id and l.status = 'approved' and l.expires_on >= current_date),
    exists (select 1 from public.promotions p
            where p.club_id = c.id and p.kind = 'trial_offer' and p.active
              and p.starts_on <= current_date and (p.ends_on is null or p.ends_on >= current_date)),
    coalesce((select array_agg(distinct coalesce(p.area_id, c.area_id)) from public.promotions p
              where p.club_id = c.id and p.kind = 'featured' and p.active
                and p.starts_on <= current_date and (p.ends_on is null or p.ends_on >= current_date)),
             '{}')
  from public.clubs c
  where c.status = 'approved';
$$;

-- New users get a profile (parent by default; "club" when signing up as a club). Never admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (user_id, role)
  values (new.id, case when wanted = 'club' then 'club'::public.user_role else 'parent'::public.user_role end);
  insert into public.parents (user_id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 80), ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a club becomes its owner. New clubs always start pending.
create or replace function public.handle_new_club()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.club_members (club_id, user_id, role)
    values (new.id, new.created_by, 'owner') on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_club_created after insert on public.clubs
  for each row execute function public.handle_new_club();

-- Guard review/status columns: only admins or trusted callers may change them.
create or replace function public.guard_review_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_trusted_caller() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'clubs' then
      new.status := 'pending'; new.reject_reason := null; new.created_by := auth.uid();
    elsif tg_table_name = 'licences' then
      new.status := 'pending'; new.reject_reason := null; new.reviewed_by := null; new.reviewed_at := null;
    elsif tg_table_name = 'club_photos' then
      new.status := 'visible'; new.uploaded_by := auth.uid();
    elsif tg_table_name = 'club_claims' then
      new.status := 'pending'; new.reviewed_at := null; new.user_id := auth.uid();
    elsif tg_table_name = 'enquiries' then
      new.status := 'sent'; new.parent_id := auth.uid();
    end if;
    return new;
  end if;
  -- UPDATE
  if tg_table_name in ('clubs', 'licences', 'club_photos', 'club_claims') then
    if new.status is distinct from old.status then
      raise exception 'only an admin can change status' using errcode = '42501';
    end if;
  end if;
  if tg_table_name = 'licences' and old.status = 'approved' then
    raise exception 'an approved licence cannot be edited; submit a new one' using errcode = '42501';
  end if;
  if tg_table_name = 'enquiries' then
    -- parents cannot edit after sending; clubs may only move the status forward
    if not public.is_club_member(old.club_id) then
      raise exception 'only the club can update an enquiry' using errcode = '42501';
    end if;
    if row(new.parent_id, new.club_id, new.contact_name, new.contact_email, new.contact_phone, new.message)
       is distinct from row(old.parent_id, old.club_id, old.contact_name, old.contact_email, old.contact_phone, old.message) then
      raise exception 'enquiry content is read-only' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger guard_clubs before insert or update on public.clubs
  for each row execute function public.guard_review_columns();
create trigger guard_licences before insert or update on public.licences
  for each row execute function public.guard_review_columns();
create trigger guard_photos before insert or update on public.club_photos
  for each row execute function public.guard_review_columns();
create trigger guard_claims before insert or update on public.club_claims
  for each row execute function public.guard_review_columns();
create trigger guard_enquiries before insert or update on public.enquiries
  for each row execute function public.guard_review_columns();

-- Profiles: users cannot change their own role.
create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and not (public.is_trusted_caller() or public.is_admin()) then
    raise exception 'role cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- A report hides the photo immediately while it is reviewed.
create or replace function public.handle_photo_report()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.club_photos set status = 'under_review'
  where id = new.photo_id and status = 'visible';
  return new;
end $$;
create trigger on_photo_reported after insert on public.photo_reports
  for each row execute function public.handle_photo_report();

-- Enquiries feed the demand view.
create or replace function public.handle_new_enquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.club_events (club_id, kind) values (new.club_id, 'enquiry');
  return new;
end $$;
create trigger on_enquiry_created after insert on public.enquiries
  for each row execute function public.handle_new_enquiry();

-- Profile views are recorded through this function only (no direct inserts).
create or replace function public.record_club_view(p_club uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.club_is_public(p_club) and not public.is_club_member(p_club) then
    insert into public.club_events (club_id, kind) values (p_club, 'view');
  end if;
end $$;

-- Admin coverage metric per cluster: clubs listed (approved) versus clubs identified.
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
  where public.is_admin() or public.is_trusted_caller()
  order by cl.sort;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger touch_clubs before update on public.clubs for each row execute function public.touch_updated_at();
create trigger touch_enquiries before update on public.enquiries for each row execute function public.touch_updated_at();
create trigger touch_parents before update on public.parents for each row execute function public.touch_updated_at();

revoke execute on function public.record_club_view(uuid) from public;
grant execute on function public.record_club_view(uuid) to anon, authenticated;
revoke execute on function public.cluster_coverage() from public, anon;
grant execute on function public.cluster_coverage() to authenticated;

-- Row-level security ------------------------------------------------------

alter table public.clusters enable row level security;
alter table public.areas enable row level security;
alter table public.categories enable row level security;
alter table public.sports enable row level security;
alter table public.profiles enable row level security;
alter table public.parents enable row level security;
alter table public.children enable row level security;
alter table public.clubs enable row level security;
alter table public.club_sports enable row level security;
alter table public.club_sessions enable row level security;
alter table public.club_members enable row level security;
alter table public.club_claims enable row level security;
alter table public.licences enable row level security;
alter table public.club_photos enable row level security;
alter table public.photo_reports enable row level security;
alter table public.saved_clubs enable row level security;
alter table public.enquiries enable row level security;
alter table public.club_events enable row level security;
alter table public.waitlist enable row level security;
alter table public.club_suggestions enable row level security;
alter table public.promotions enable row level security;

-- Reference data: anyone reads; admins write.
create policy "read clusters" on public.clusters for select using (true);
create policy "admin writes clusters" on public.clusters for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read areas" on public.areas for select using (true);
create policy "admin writes areas" on public.areas for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read categories" on public.categories for select using (true);
create policy "read sports" on public.sports for select using (true);

-- Profiles and parents: own row only.
create policy "own profile" on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own parent row read" on public.parents for select to authenticated using (user_id = auth.uid());
create policy "own parent row write" on public.parents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Children: own only.
create policy "own children" on public.children for all to authenticated
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Clubs
create policy "read public or own clubs" on public.clubs for select
  using (status = 'approved' or public.is_club_member(id) or public.is_admin());
create policy "signed-in users create clubs" on public.clubs for insert to authenticated
  with check (created_by = auth.uid());
create policy "members or admin update clubs" on public.clubs for update to authenticated
  using (public.is_club_member(id) or public.is_admin()) with check (public.is_club_member(id) or public.is_admin());

create policy "read club sports" on public.club_sports for select
  using (public.club_is_public(club_id) or public.is_club_member(club_id) or public.is_admin());
create policy "members write club sports" on public.club_sports for all to authenticated
  using (public.is_club_member(club_id) or public.is_admin()) with check (public.is_club_member(club_id) or public.is_admin());

create policy "read sessions" on public.club_sessions for select
  using (public.club_is_public(club_id) or public.is_club_member(club_id) or public.is_admin());
create policy "members write sessions" on public.club_sessions for all to authenticated
  using (public.is_club_member(club_id) or public.is_admin()) with check (public.is_club_member(club_id) or public.is_admin());

create policy "read own memberships" on public.club_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "admin manages members" on public.club_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "own claims" on public.club_claims for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "create claim" on public.club_claims for insert to authenticated with check (user_id = auth.uid());
create policy "admin reviews claims" on public.club_claims for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Licences: club members and admins only.
create policy "members and admin read licences" on public.licences for select to authenticated
  using (public.is_club_member(club_id) or public.is_admin());
create policy "members submit licences" on public.licences for insert to authenticated
  with check (public.is_club_member(club_id));
create policy "admin reviews licences" on public.licences for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Photos
create policy "read visible photos" on public.club_photos for select
  using ((status = 'visible' and public.club_is_public(club_id)) or public.is_club_member(club_id) or public.is_admin());
create policy "members upload photos" on public.club_photos for insert to authenticated
  with check (public.is_club_member(club_id) and consent_confirmed_at is not null);
create policy "members or admin update photos" on public.club_photos for update to authenticated
  using (public.is_club_member(club_id) or public.is_admin()) with check (public.is_club_member(club_id) or public.is_admin());
create policy "members delete photos" on public.club_photos for delete to authenticated
  using (public.is_club_member(club_id) or public.is_admin());

create policy "report a photo" on public.photo_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "read own or all reports (admin)" on public.photo_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy "admin resolves reports" on public.photo_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Saved clubs: own only.
create policy "own saved clubs" on public.saved_clubs for all to authenticated
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Enquiries: the parent who sent it and the club that received it.
create policy "parent reads own enquiries" on public.enquiries for select to authenticated
  using (parent_id = auth.uid() or public.is_club_member(club_id));
create policy "parent sends enquiry" on public.enquiries for insert to authenticated
  with check (parent_id = auth.uid() and public.club_is_public(club_id) and contact_consent_at is not null);
create policy "club updates enquiry status" on public.enquiries for update to authenticated
  using (public.is_club_member(club_id)) with check (public.is_club_member(club_id));

-- Demand events: read by the club and admins; written only by security-definer functions.
create policy "members read events" on public.club_events for select to authenticated
  using (public.is_club_member(club_id) or public.is_admin());

-- Waitlist: anyone can join for a coming-soon area; only admins read.
create policy "join waitlist" on public.waitlist for insert
  with check (exists (select 1 from public.areas a where a.id = area_id and a.status = 'coming_soon'));
create policy "admin reads waitlist" on public.waitlist for select to authenticated using (public.is_admin());

create policy "suggest a club" on public.club_suggestions for insert with check (true);
create policy "admin reads suggestions" on public.club_suggestions for select to authenticated using (public.is_admin());

-- Promotions (stub): readable so the Featured slot can render; admin writes.
create policy "read promotions" on public.promotions for select using (active);
create policy "admin writes promotions" on public.promotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
