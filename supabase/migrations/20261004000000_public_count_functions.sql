-- Public, count-only functions for follower / save totals, plus the indexes
-- they need.
--
-- Product decision (see 20261002000000): users' profiles and actions are
-- private, only aggregate numbers may be shown. follows / saved_events /
-- saved_spots have only "own rows" RLS, so a visitor reading them would see at
-- most their own row. These SECURITY DEFINER functions count across users but
-- return one number and never ids, so the list of followers stays private.
--
-- The target id is an argument here (it is public information, like the page
-- URL); the caller's identity is never used, so the number is the same for
-- everyone, including logged-out visitors.
--
-- Exclusions match the owner-only counts, so the public number and the number
-- on the creator's dashboard are the same:
--   * follows: a self-follow is not counted (f.user_id <> f.profile_id)
--   * saved_events: the host saving their own event is not counted
--   * saved_spots: the owner saving their own spot is not counted
--
-- Idempotent. To be run by hand in the Supabase SQL Editor.

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- The unique (user_id, event_id|spot_id) constraints lead with user_id, so
-- counting by event or spot would scan. follows already has
-- idx_follows_profile_id.
create index if not exists idx_saved_events_event_id on public.saved_events (event_id);
create index if not exists idx_saved_spots_spot_id   on public.saved_spots  (spot_id);

-- ── Followers of a profile ──────────────────────────────────────────────────
create or replace function public.profile_follower_count(p_profile_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.follows f
  where f.profile_id = p_profile_id
    and f.user_id <> f.profile_id
$$;

-- ── Saves of an event ───────────────────────────────────────────────────────
create or replace function public.event_saved_count(p_event_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.saved_events se
  join public.events e on e.id = se.event_id
  where se.event_id = p_event_id
    and se.user_id is distinct from e.profile_id
$$;

-- ── Saves of a spot ─────────────────────────────────────────────────────────
-- saved_spots.spot_id is text, spots.id is uuid.
create or replace function public.spot_saved_count(p_spot_id text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.saved_spots ss
  join public.spots s on s.id::text = ss.spot_id
  where ss.spot_id = p_spot_id
    and ss.user_id is distinct from s.owner_id
    and ss.user_id is distinct from s.claimed_by_profile_id
$$;

revoke all on function public.profile_follower_count(uuid) from public;
revoke all on function public.event_saved_count(uuid)      from public;
revoke all on function public.spot_saved_count(text)       from public;
grant execute on function public.profile_follower_count(uuid) to anon, authenticated, service_role;
grant execute on function public.event_saved_count(uuid)      to anon, authenticated, service_role;
grant execute on function public.spot_saved_count(text)       to anon, authenticated, service_role;
