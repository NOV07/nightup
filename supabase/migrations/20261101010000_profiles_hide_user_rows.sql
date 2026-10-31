-- Hide plain 'user' rows of public.profiles from everyone but their owner.
--
-- Why: profiles had two SELECT policies, "Public profiles viewable by everyone"
-- (using true) and "Public profiles with network_tab are readable"
-- (network_tab IS NOT NULL), both for role public. Every row was therefore
-- readable with the anon key, including the bio, instagram, facebook, tiktok,
-- website and phone of accounts with profile_type = 'user', who have no public
-- profile and are told "Only you can see your bio and socials". Only the app
-- (notFound() on /profile/<user>) hid them.
--
-- New rule: a row is readable when its profile_type is not 'user', or when it
-- is the caller's own row. A NULL profile_type is hidden (fail closed).
-- Creator rows (artist, organizer, venue, professional, spot) keep exactly the
-- visibility they have today, phone and booking_email included.
--
-- Run ORDER matters:
--   1. 20261101000000_username_taken_function.sql must already be applied.
--   2. The app code that reads actors with the service role (notifications,
--      dashboard interests) and calls username_taken() must be deployed. Until
--      it is, a creator's bell and interest list lose the name of plain users.
--
-- Not affected: service_role (admin routes, notify.ts, scripts) and SECURITY
-- DEFINER functions (delete_account, increment_profile_views,
-- profile_follower_count) bypass RLS. Foreign-key checks bypass it too.
--
-- Known, accepted: a plain user who is later upgraded keeps their bio, socials
-- and phone, which then become public. The upgrade flow says so.
--
-- Guards: aborts if profiles has an ALL policy (it would keep SELECT open) or if
-- RLS is off. Drops EVERY SELECT policy on profiles, then creates one. Idempotent.
-- To be run by hand in the Supabase SQL Editor.
--
-- Rollback (restores the two policies that existed, both role public):
--   begin;
--     drop policy if exists "Creator profiles are public, users see their own" on public.profiles;
--     create policy "Public profiles viewable by everyone"
--       on public.profiles for select to public using (true);
--     create policy "Public profiles with network_tab are readable"
--       on public.profiles for select to public using (network_tab is not null);
--   commit;

begin;

alter table public.profiles enable row level security;

do $$
begin
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'profiles' and cmd = 'ALL') then
    raise exception 'profiles has an ALL policy; it would keep SELECT open. Review it first.';
  end if;
end $$;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy "Creator profiles are public, users see their own"
  on public.profiles for select
  to anon, authenticated
  using (profile_type <> 'user' or id = (select auth.uid()));

commit;
