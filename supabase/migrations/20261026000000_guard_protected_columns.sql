-- Column guards for tables creators can write straight through Supabase REST.
--
-- Why: authenticated/anon hold table-level INSERT and UPDATE on events,
-- listings, music_releases, profiles and spots, and the RLS policies only check
-- ownership, not columns. A creator with their own JWT could therefore skip the
-- app routes and write status='approved', is_sponsored=true, plan_tier=..,
-- profile_type=.. etc. directly. These triggers close that at the database.
--
-- Rule (denylist, per table):
--   INSERT  protected columns are forced to their default value.
--   UPDATE  changing a protected column raises 42501 (insufficient_privilege).
--           Writing the same value back is allowed, so a PATCH that sends a
--           whole row does not trip it.
--
-- Who is checked: current_user in ('authenticated', 'anon') only. That is the
-- role PostgREST switches to for a request carrying a user's (or no) JWT.
--   * service_role  (every /api/admin/* route, scripts)  -> not checked.
--   * postgres      (SQL editor, migrations)             -> not checked.
--   * security definer functions (sync_event_reaction_count, increment_event_views,
--     increment_profile_views, delete_account) run as their owner, so they keep
--     working even though the request JWT still says 'authenticated'. This is why
--     auth.role() is NOT used here.
--   * FK actions (events.profile_id ON DELETE SET NULL) run as the table owner.
--
-- Columns that do not exist on a given database are ignored (the checks read
-- them through jsonb), so this file does not depend on optional/legacy columns.
--
-- Not changed: policies, grants, existing rows. Idempotent.
-- To be run by hand in the Supabase SQL Editor.
--
-- Rollback:
--   drop trigger if exists guard_protected_columns on public.<table>;  (x7)
--   drop function if exists public.guard_<table>_columns();            (6 functions, see above)
--   drop function if exists public.guard_first_changed(jsonb, jsonb, text[]);

begin;

-- First column in `cols` whose value differs between old and new, else null.
create or replace function public.guard_first_changed(old_row jsonb, new_row jsonb, cols text[])
returns text
language sql
immutable
set search_path = public
as $$
  select c
  from unnest(cols) as c
  where (old_row -> c) is distinct from (new_row -> c)
  limit 1
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
-- Created only by /api/profiles with the user's own session (no auth.users
-- trigger), always as a plain 'user'. profile_type/plan_tier are promoted by
-- /api/admin/approve-upgrade (service role).
-- Left writable on purpose: network_tab / network_category / network_subcategory
-- (the dashboard and both wizards write them).
create or replace function public.guard_profiles_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bad text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(
      'profile_type',        'user',
      'plan_tier',           'free',
      'is_verified',         false,
      'is_featured',         false,
      'view_count',          0,
      'professional_status', 'approved'
    ));
    return new;
  end if;

  bad := public.guard_first_changed(to_jsonb(old), to_jsonb(new), array[
    'id', 'created_at', 'profile_type', 'plan_tier', 'is_verified',
    'is_featured', 'professional_status', 'view_count'
  ]);
  if bad is not null then
    raise exception 'column "%" of % cannot be changed by this role', bad, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_protected_columns on public.profiles;
create trigger guard_protected_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profiles_columns();

-- ── events ──────────────────────────────────────────────────────────────────
-- status is flipped by /api/admin/action (service role); picks and featuring by
-- the admin routes; the counters by definer functions. profile_id is set once,
-- on insert, by /api/events (the INSERT policy already pins it to auth.uid()).
-- Left writable on purpose: age_restriction, contact_phone, website (legacy).
create or replace function public.guard_events_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bad text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(
      'status',                   'pending',
      'nightup_pick',             false,
      'is_radar_pick',            false,
      'view_count',               0,
      'views',                    0,
      'going_count',              0,
      'interested_count',         0,
      'has_copyright_restriction', false,
      'featured_until',           null
    ));
    return new;
  end if;

  bad := public.guard_first_changed(to_jsonb(old), to_jsonb(new), array[
    'id', 'created_at', 'profile_id', 'status', 'nightup_pick', 'is_radar_pick',
    'featured_until', 'view_count', 'views', 'going_count', 'interested_count',
    'has_copyright_restriction'
  ]);
  if bad is not null then
    raise exception 'column "%" of % cannot be changed by this role', bad, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_protected_columns on public.events;
create trigger guard_protected_columns
  before insert or update on public.events
  for each row execute function public.guard_events_columns();

-- ── music_releases ──────────────────────────────────────────────────────────
-- Defaults taken from the app: /api/releases inserts status 'pending'; the admin
-- form's promoted flag starts false. Editing an approved release does not send
-- it back to review (decision), so status is simply not writable.
create or replace function public.guard_music_releases_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bad text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(
      'status',      'pending',
      'is_promoted', false
    ));
    return new;
  end if;

  bad := public.guard_first_changed(to_jsonb(old), to_jsonb(new), array[
    'id', 'created_at', 'profile_id', 'status', 'is_promoted'
  ]);
  if bad is not null then
    raise exception 'column "%" of % cannot be changed by this role', bad, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_protected_columns on public.music_releases;
create trigger guard_protected_columns
  before insert or update on public.music_releases
  for each row execute function public.guard_music_releases_columns();

-- ── listings ────────────────────────────────────────────────────────────────
-- is_sponsored default false (20260609001000_listings.sql). is_active stays
-- writable by the owner (soft delete / reactivate) — unchanged on purpose.
create or replace function public.guard_listings_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bad text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(
      'is_sponsored', false
    ));
    return new;
  end if;

  bad := public.guard_first_changed(to_jsonb(old), to_jsonb(new), array[
    'id', 'created_at', 'profile_id', 'is_sponsored'
  ]);
  if bad is not null then
    raise exception 'column "%" of % cannot be changed by this role', bad, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_protected_columns on public.listings;
create trigger guard_protected_columns
  before insert or update on public.listings
  for each row execute function public.guard_listings_columns();

-- ── spots ───────────────────────────────────────────────────────────────────
-- is_published defaults to TRUE on purpose (spots go live immediately), so the
-- insert forces true, not false. Owners may not change it afterwards.
-- slug is generated by /api/spots and is the public URL, so it is fixed after
-- insert. owner_id is pinned on insert by the INSERT policy; claimed_by_profile_id
-- is written only by /api/admin/approve-claim.
create or replace function public.guard_spots_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bad text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(
      'is_published',           true,
      'is_sponsored',           false,
      'featured',               false,
      'rating',                 null,
      'claimed_by_profile_id',  null
    ));
    return new;
  end if;

  bad := public.guard_first_changed(to_jsonb(old), to_jsonb(new), array[
    'id', 'created_at', 'is_published', 'is_sponsored', 'featured', 'rating',
    'slug', 'owner_id', 'claimed_by_profile_id'
  ]);
  if bad is not null then
    raise exception 'column "%" of % cannot be changed by this role', bad, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_protected_columns on public.spots;
create trigger guard_protected_columns
  before insert or update on public.spots
  for each row execute function public.guard_spots_columns();

-- ── featured_event_requests / spot_claims ───────────────────────────────────
-- The INSERT policies only check ownership, so a user could insert a row that
-- is already 'approved'. Admin flips status with the service role.
create or replace function public.guard_request_status_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object('status', 'pending'));
    return new;
  end if;

  if (to_jsonb(old) -> 'status') is distinct from (to_jsonb(new) -> 'status') then
    raise exception 'column "status" of % cannot be changed by this role', tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_protected_columns on public.featured_event_requests;
create trigger guard_protected_columns
  before insert or update on public.featured_event_requests
  for each row execute function public.guard_request_status_columns();

drop trigger if exists guard_protected_columns on public.spot_claims;
create trigger guard_protected_columns
  before insert or update on public.spot_claims
  for each row execute function public.guard_request_status_columns();

commit;
