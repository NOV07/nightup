-- Application code no longer reads or writes spots.claimed_by_profile_id (the
-- claim-spot feature was removed). This migration rewrites every function and
-- policy that still referenced the column so that only owner_id is used.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.
--
-- Rewritten here (each is the latest definition from the earlier migration named
-- next to it, with ONLY the claimed_by_profile_id term removed):
--   * public.delete_account(uuid)        20261003000000_delete_account_function.sql
--   * public.my_spot_saved_counts()      20261002000000_private_follows_and_owner_counts.sql
--   * public.spot_saved_count(text)      20261004000000_public_count_functions.sql
--   * public.guard_spots_columns()       20261026000000_guard_protected_columns.sql
--   * policy "Owners can update their spot" on public.spots   20260808010000_add_spot_owner_id.sql
--   * policy "Owners can read their own spot" on public.spots 20260808010000_add_spot_owner_id.sql
--
-- NOT touched: the spot_claims table and the spots.claimed_by_profile_id column
-- (no DROP here), the guard_protected_columns trigger on spots and on
-- spot_claims, and public.guard_request_status_columns() (still used by
-- featured_event_requests).
--
-- One transaction, so the DROP POLICY / CREATE POLICY pairs never leave the
-- spots table without its owner policies.

begin;

-- ── public.delete_account(uuid) ──
create or replace function public.delete_account(target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n          int;
  result     jsonb := '{}'::jsonb;
  spot_ids   text[];
  event_ids  text[];
begin
  if target is null then
    raise exception 'delete_account: target is null';
  end if;

  -- 1. Notifications this user caused for other people. actor_id is ON DELETE
  --    SET NULL, so without this they would survive with no actor.
  delete from notifications where actor_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('notifications_as_actor', n);

  -- 2. The user's own activity. Explicit (rather than left to the auth cascade)
  --    so it happens inside this transaction.
  delete from event_reactions where user_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('event_reactions', n);

  delete from saved_events where user_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('saved_events', n);

  delete from saved_spots where user_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('saved_spots', n);

  -- Both directions: whom they follow, and who follows them.
  delete from follows where user_id = target or profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('follows', n);

  delete from notifications where user_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('notifications', n);

  delete from listing_interests where profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('listing_interests', n);

  delete from upgrade_requests where user_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('upgrade_requests', n);

  -- 3. Ids of the content that is about to go, as text because the two save
  --    tables have no FK and saved_spots.spot_id is text.
  select coalesce(array_agg(id::text), '{}') into spot_ids
    from spots where owner_id = target;
  select coalesce(array_agg(id::text), '{}') into event_ids
    from events where profile_id = target;

  -- 4. Other users' saves of that content (no cascade exists for these).
  delete from saved_spots where spot_id = any(spot_ids);
  get diagnostics n = row_count; result := result || jsonb_build_object('others_saved_spots', n);

  delete from saved_events where event_id::text = any(event_ids);
  get diagnostics n = row_count; result := result || jsonb_build_object('others_saved_events', n);

  -- 5. Spots owned by the user. spot_claims cascade.
  delete from spots where id::text = any(spot_ids);
  get diagnostics n = row_count; result := result || jsonb_build_object('spots', n);

  -- 6. The rest of the owned content. event_reactions / featured_event_requests
  --    cascade from events, listing_interests from listings.
  delete from events where profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('events', n);

  delete from creator_gallery where profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('creator_gallery', n);

  delete from listings where profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('listings', n);

  delete from music_releases where profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('music_releases', n);

  delete from artists where profile_id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('artists', n);

  -- 7. The profile itself. Anything still pointing at it with NO ACTION would
  --    raise here and roll the whole function back.
  delete from profiles where id = target;
  get diagnostics n = row_count; result := result || jsonb_build_object('profiles', n);

  return result;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;

-- ── public.my_spot_saved_counts() ──
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
  where auth.role() = 'service_role'
     or s.owner_id = auth.uid()
  group by s.id
$$;

revoke all on function public.my_spot_saved_counts()  from public, anon;
grant execute on function public.my_spot_saved_counts()  to authenticated, service_role;

-- ── public.spot_saved_count(text) ──
create or replace function public.spot_saved_count(p_spot_id text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.saved_spots ss
  join public.spots s on s.id::text = ss.spot_id
  where ss.spot_id = p_spot_id
    and ss.user_id is distinct from s.owner_id;
$$;

revoke all on function public.spot_saved_count(text)       from public;
grant execute on function public.spot_saved_count(text)       to anon, authenticated, service_role;

-- ── public.guard_spots_columns() ──
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
      'rating',                 null
    ));
    return new;
  end if;

  bad := public.guard_first_changed(to_jsonb(old), to_jsonb(new), array[
    'id', 'created_at', 'is_published', 'is_sponsored', 'featured', 'rating',
    'slug', 'owner_id'
  ]);
  if bad is not null then
    raise exception 'column "%" of % cannot be changed by this role', bad, tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── policy "Owners can update their spot" ──
DROP POLICY IF EXISTS "Owners can update their spot" ON spots;
CREATE POLICY "Owners can update their spot" ON spots
  FOR UPDATE TO authenticated
  USING      (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── policy "Owners can read their own spot" ──
DROP POLICY IF EXISTS "Owners can read their own spot" ON spots;
CREATE POLICY "Owners can read their own spot" ON spots
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

commit;
