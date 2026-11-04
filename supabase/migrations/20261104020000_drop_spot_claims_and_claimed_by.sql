-- Final step of removing the claim-spot feature: drop the spot_claims table and
-- the spots.claimed_by_profile_id column.
--
-- ALREADY APPLIED MANUALLY to the production database (Supabase SQL Editor).
-- This file only records it so a fresh environment ends up with the same schema;
-- it is idempotent, so running it again on production is a no-op.
--
-- Depends on 20261104010000_spots_drop_claimed_by_references.sql, which rewrote
-- every function and policy that still referenced the column. Dropping the table
-- also removes its indexes, policies and guard_protected_columns trigger. The
-- function public.guard_request_status_columns() is NOT dropped: it is still
-- used by featured_event_requests.

begin;

drop table if exists public.spot_claims;
alter table public.spots drop column if exists claimed_by_profile_id;

commit;
