-- Trigger functions are never called over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_club() from public, anon, authenticated;
revoke execute on function public.handle_new_enquiry() from public, anon, authenticated;
revoke execute on function public.handle_photo_report() from public, anon, authenticated;
revoke execute on function public.guard_review_columns() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Intentionally callable (advisor warnings accepted, see DECISIONS.md):
--   is_admin(), is_club_member(uuid), club_is_public(uuid): used inside RLS policies; return a
--     boolean about the caller or about a club that is already public.
--   club_badges(): public booleans per approved club.
--   record_club_view(uuid): the only way to record a profile view.
--   cluster_coverage(): returns rows only to admins.
