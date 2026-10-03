-- Drop the legacy listing-interest notification trigger.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.
--
-- on_listing_interest (AFTER INSERT on listing_interests, created by hand in
-- the dashboard, no migration history) wrote its own 'listing_interest'
-- notification ("Νέο ενδιαφέρον για την αγγελία σου", link /dashboard) in the
-- same statement as the insert. app/api/listings/[id]/interest/route.ts then
-- calls sendNotification (app/lib/notify.ts), whose 24h dedupe on
-- (recipient, actor, type) found the trigger's row and skipped. Net effect,
-- verified 2026-10-03 with a throwaway account: exactly one notification, but
-- always the trigger's, never the route's (title with the listing name, link to
-- the interested profile).
--
-- After this, the route's sendNotification is the only writer, same as
-- new_follow (20261002020000_notifications_server_only_insert.sql).

drop trigger if exists on_listing_interest on public.listing_interests;
drop function if exists public.notify_on_listing_interest();
