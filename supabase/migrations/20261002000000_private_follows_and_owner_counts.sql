-- Count-only functions for creator stats.
--
-- Product decision: users' profiles and actions are private; only aggregate
-- numbers may be shown.
--
-- The "Saved" tile in the creator stats counted saved_events through the
-- caller's session, where RLS ("select own") returns only the caller's own
-- rows, so it was ~always 0. The functions below replace that: SECURITY DEFINER
-- so they can count across users, but they return numbers only and are scoped
-- to what the caller owns, derived from auth.uid() (never from an argument).
--
-- The follows policy side of this change ("Follow counts are public" dropped,
-- only "Users can manage their own follows" left) was applied by hand in the
-- Supabase SQL Editor and is intentionally not repeated here.
--
-- Admin: the admin panel is not a Supabase session, it uses the service-role
-- client. Service role is therefore allowed to see every row's count.
--
-- Idempotent. To be run by hand in the Supabase SQL Editor.

-- ── Saves per event, for the events I host ──────────────────────────────────
-- One row per event I own (zero included). A host saving their own event is
-- not counted.
create or replace function public.my_event_saved_counts()
returns table (event_id uuid, saved_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, count(se.id)
  from public.events e
  left join public.saved_events se
         on se.event_id = e.id
        and se.user_id is distinct from e.profile_id
  where auth.role() = 'service_role' or e.profile_id = auth.uid()
  group by e.id
$$;

-- ── Saves per spot, for the spots I own ─────────────────────────────────────
-- saved_spots.spot_id is text, spots.id is uuid. Both ownership columns count
-- (owner_id from the wizard, claimed_by_profile_id from the older claim flow).
create or replace function public.my_spot_saved_counts()
returns table (spot_id text, saved_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.id::text, count(ss.id)
  from public.spots s
  left join public.saved_spots ss
         on ss.spot_id = s.id::text
        and ss.user_id is distinct from s.owner_id
        and ss.user_id is distinct from s.claimed_by_profile_id
  where auth.role() = 'service_role'
     or s.owner_id = auth.uid()
     or s.claimed_by_profile_id = auth.uid()
  group by s.id
$$;

-- ── Followers of my own profile (artist / professional / venue / ...) ───────
create or replace function public.my_follower_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.follows f
  where f.user_id <> f.profile_id
    and (auth.role() = 'service_role' or f.profile_id = auth.uid())
$$;

revoke all on function public.my_event_saved_counts() from public, anon;
revoke all on function public.my_spot_saved_counts()  from public, anon;
revoke all on function public.my_follower_count()     from public, anon;
grant execute on function public.my_event_saved_counts() to authenticated, service_role;
grant execute on function public.my_spot_saved_counts()  to authenticated, service_role;
grant execute on function public.my_follower_count()     to authenticated, service_role;
