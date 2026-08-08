-- REQUIRED for the venue wizard's step 2 — run by hand before using it.
--
-- The brief assumed venues needed no data migration because `venue` is already
-- a profile_type living in `profiles`. That holds for everything except the
-- address: `profiles` has `location` (free text, currently a city name like
-- 'Athens') and nothing else. There is no address or neighborhood column on
-- profiles at all — confirmed against the live schema, all 52 columns.
--
-- Named with the venue_ prefix to match `venue_capacity`, the convention the
-- table already uses for venue-only fields.
--
-- No lat/lng, no PostGIS: venues are directory-only and deliberately out of the
-- proximity search that spots use.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_neighborhood text;
