-- Profile view tracking for non-organizer profile types (artist, professional, venue-as-profile).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.profiles add column if not exists view_count integer not null default 0;

create or replace function increment_profile_views(target_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set view_count = view_count + 1 where id = target_profile_id;
$$;

grant execute on function increment_profile_views(uuid) to anon, authenticated;
