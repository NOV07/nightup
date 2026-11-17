-- Replace profiles_network_tab_check with the values the app really stores.
--
-- 20260511000000_add_network_taxonomy.sql created the constraint with
-- ('Plan Your Event', 'For Artists'), which the app never wrote. Production
-- already holds 'Artists' (ravar, motiva), so the constraint was dropped or
-- changed by hand there. Run this ONLY if
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.profiles'::regclass and conname = 'profiles_network_tab_check';
-- still returns the old definition (or any definition that rejects 'Artists'):
-- the backfill 20261117010000 would otherwise fail.
--
-- Valid values (app/lib/types.ts NetworkTab, written by the dashboard, the
-- Professional and Venue wizards): 'Artists', 'Professionals', 'Venues'.
-- To be run by hand in the Supabase SQL Editor. Idempotent.
--
-- Rollback:
--   alter table public.profiles drop constraint if exists profiles_network_tab_check;

begin;

do $$
declare bad text;
begin
  select string_agg(distinct network_tab, ', ') into bad
  from public.profiles
  where network_tab is not null
    and network_tab not in ('Artists', 'Professionals', 'Venues');
  if bad is not null then
    raise exception 'profiles.network_tab holds values outside the new list: %', bad;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_network_tab_check;

alter table public.profiles
  add constraint profiles_network_tab_check
  check (network_tab is null or network_tab in ('Artists', 'Professionals', 'Venues'));

commit;
