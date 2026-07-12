-- View tracking for events and organizer profiles (tracked independently).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

-- 1) New columns.
-- `add column if not exists` is supported on this Postgres/Supabase setup
-- (see 20260630000000_add_event_type.sql for precedent), so no extra guard is needed.
alter table events add column if not exists view_count integer not null default 0;
alter table organizers add column if not exists view_count integer not null default 0;

-- 2) Atomic increment RPCs, callable by anon/public without granting general write access.
create or replace function increment_event_views(event_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update events set view_count = view_count + 1 where id = event_id;
$$;

create or replace function increment_organizer_views(organizer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update organizers set view_count = view_count + 1 where id = organizer_id;
$$;

grant execute on function increment_event_views(uuid) to anon, authenticated;
grant execute on function increment_organizer_views(uuid) to anon, authenticated;

-- REMINDER: Οι δύο ALTER TABLE (βήμα 1) πρέπει να τρέξουν σε ξεχωριστό
-- transaction/statement από τα CREATE FUNCTION (βήμα 2), όπως πάντα με νέες
-- στήλες σε αυτό το project.
