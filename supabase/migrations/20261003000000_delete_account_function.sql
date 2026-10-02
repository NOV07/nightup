-- Self-service account deletion. Called ONLY by app/api/account/route.ts with
-- the service role, after that route has re-verified the user's password.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.
--
-- Everything the account owns goes in one transaction (a plpgsql function body
-- is atomic): either the whole account is gone or nothing is. The auth user is
-- deleted afterwards by the route via the admin API; profiles.id -> auth.users
-- is ON DELETE CASCADE live, but the profile is already gone by then.
--
-- Differences from the admin force delete (app/api/admin/delete/route.ts), on
-- purpose: spots the user owns OR has claimed are deleted, not detached.
--
-- Live schema facts this relies on (STOP 1 inventory, 2026-10-02):
--   * saved_events.event_id and saved_spots.spot_id have NO foreign key, so
--     other users' saves of this account's events/spots are deleted by id here.
--   * events / music_releases / artists .profile_id are ON DELETE SET NULL, and
--     spots.owner_id / claimed_by_profile_id are NO ACTION, so all of them are
--     deleted explicitly before the profile row.
--   * event_reactions, featured_event_requests (-> events), spot_claims
--     (-> spots), listing_interests (-> listings) cascade from their parents.
--   * trg_event_reactions_sync keeps events.going_count / interested_count in
--     step on every deleted reaction, cascaded or not.

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
    from spots where owner_id = target or claimed_by_profile_id = target;
  select coalesce(array_agg(id::text), '{}') into event_ids
    from events where profile_id = target;

  -- 4. Other users' saves of that content (no cascade exists for these).
  delete from saved_spots where spot_id = any(spot_ids);
  get diagnostics n = row_count; result := result || jsonb_build_object('others_saved_spots', n);

  delete from saved_events where event_id::text = any(event_ids);
  get diagnostics n = row_count; result := result || jsonb_build_object('others_saved_events', n);

  -- 5. Spots, owned or claimed. spot_claims cascade.
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
