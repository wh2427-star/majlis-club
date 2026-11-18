-- Storage buckets. Both are private; the app serves photos through short-lived signed URLs.
-- Object paths start with the club id: "<club_id>/<file>".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('club-photos', 'club-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('licences', 'licences', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create or replace function public.storage_club_id(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

-- Club photos: the public may read an object only while its photo row is visible.
create policy "read visible club photos" on storage.objects for select
  using (
    bucket_id = 'club-photos' and (
      exists (select 1 from public.club_photos p
              where p.storage_path = name and p.status = 'visible' and public.club_is_public(p.club_id))
      or public.is_club_member(public.storage_club_id(name))
      or public.is_admin()
    )
  );
create policy "members upload club photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'club-photos' and public.is_club_member(public.storage_club_id(name)));
create policy "members delete club photos" on storage.objects for delete to authenticated
  using (bucket_id = 'club-photos' and (public.is_club_member(public.storage_club_id(name)) or public.is_admin()));

-- Licence documents: club members and admins only.
create policy "members and admin read licence docs" on storage.objects for select to authenticated
  using (bucket_id = 'licences' and (public.is_club_member(public.storage_club_id(name)) or public.is_admin()));
create policy "members upload licence docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'licences' and public.is_club_member(public.storage_club_id(name)));
