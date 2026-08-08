-- APPLIED 2026-08-08. Do not run again.
--
-- Re-running it fails with:
--   ERROR: function regexp_replace(integer, unknown, unknown, unknown) does not exist
-- That error is proof the statement already succeeded, not a failure: the
-- column is integer now, and regexp_replace only takes text. Nothing to fix.
--
-- Was OPTIONAL — the app worked either side of it.
--
-- The brief asked for a new `capacity integer` column on profiles, on the
-- premise that no capacity field exists. One does: `venue_capacity`. It is
-- `text`, set on zero rows, and referenced nowhere in app/ or components/ —
-- dead since it was added. Adding `capacity` alongside it would leave two
-- columns meaning the same thing, one of them permanently dead, so the venue
-- wizard writes `venue_capacity` instead.
--
-- Verified before writing this:
--   SELECT count(*) FROM profiles WHERE venue_capacity IS NOT NULL;  -- 0
--   grep -rn "venue_capacity" app components                          -- no hits
--
-- This statement is the tidy-up: make the column the integer the brief wanted.
-- The wizard sends a JSON number either way (confirmed against the live text
-- column — Postgres casts it), so the app behaves identically before and after.
-- The only difference is that afterwards the database rejects "about 400" and
-- reads back 450 rather than "450".
--
-- Safe because the column is empty. USING is still spelled out so the statement
-- stays correct if a row is written before it runs.

ALTER TABLE public.profiles
  ALTER COLUMN venue_capacity TYPE integer
  USING NULLIF(regexp_replace(venue_capacity, '[^0-9]', '', 'g'), '')::integer;
