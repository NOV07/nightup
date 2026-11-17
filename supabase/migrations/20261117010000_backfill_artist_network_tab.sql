-- Backfill: approved artists that never picked a role have network_tab NULL and
-- so are missing from /network/artists (e.g. djpoleashed, test).
-- Code fix: approve-upgrade and the dashboard now always set network_tab 'Artists'.
--
-- To be run by hand in the Supabase SQL Editor, AFTER checking:
--
--   -- 0. the constraint must accept 'Artists' (else run 20261117000000 first)
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.profiles'::regclass and conname = 'profiles_network_tab_check';
--
--   -- 1. the rows that will change
--   select id, username, profile_type, professional_status, network_tab, network_subcategory
--   from profiles
--   where profile_type = 'artist' and professional_status = 'approved' and network_tab is null;
--
-- Idempotent: a second run matches no rows. Existing 'Artists' rows are untouched.
--
-- Rollback (only for the rows listed by the select above, kept by id):
--   update profiles set network_tab = null where id in (<ids from select 1>);

update profiles
set network_tab = 'Artists'
where profile_type = 'artist'
  and professional_status = 'approved'
  and network_tab is null;
