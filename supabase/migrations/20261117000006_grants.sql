-- Explicit, least-privilege table grants for the API roles. Row-level security still decides
-- which rows each role sees; these grants decide which operations are possible at all.

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Public directory (anon and signed-in)
grant select on public.clusters, public.areas, public.categories, public.sports,
  public.clubs, public.club_sports, public.club_sessions, public.club_photos, public.promotions
  to anon, authenticated;
grant insert on public.waitlist, public.club_suggestions to anon, authenticated;

-- Signed-in users (RLS narrows every one of these to own rows, own club, or admin)
grant select, update on public.profiles, public.parents to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant insert, update on public.clubs to authenticated;
grant insert, update, delete on public.club_sports, public.club_sessions to authenticated;
grant select, insert, update, delete on public.club_members to authenticated;
grant select, insert, update on public.club_claims to authenticated;
grant select, insert, update on public.licences to authenticated;
grant insert, update, delete on public.club_photos to authenticated;
grant select, insert, update on public.photo_reports to authenticated;
grant select, insert, delete on public.saved_clubs to authenticated;
grant select, insert, update on public.enquiries to authenticated;
grant select on public.club_events to authenticated;
grant select on public.waitlist, public.club_suggestions to authenticated;
grant insert, update, delete on public.promotions, public.clusters, public.areas to authenticated;
