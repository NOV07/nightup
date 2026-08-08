-- Flips section_visibility's gallery key to true for profiles created from now
-- on. Two seed sessions (artist, professional) shipped galleries that rendered
-- nowhere until the flag was flipped by hand; almost nobody uploads a gallery
-- intending to hide it.
--
-- NOTE: run by hand in the Supabase SQL Editor. The column has no migration of
-- its own in this repo — it was created through the dashboard — so this file is
-- the first tracked statement touching it.
--
-- The eight other keys are copied verbatim from the live default, read back
-- empirically (insert a row omitting the column, read what Postgres filled in)
-- rather than guessed:
--   {"mixes": false, "gallery": false, "releases": true, "portfolio": false,
--    "booking_cta": true, "music_embed": false, "about_services": true,
--    "featured_track": true, "upcoming_events": true}
-- Only `gallery` changes.

ALTER TABLE public.profiles
  ALTER COLUMN section_visibility
  SET DEFAULT '{
    "mixes": false,
    "gallery": true,
    "releases": true,
    "portfolio": false,
    "booking_cta": true,
    "music_embed": false,
    "about_services": true,
    "featured_track": true,
    "upcoming_events": true
  }'::jsonb;

-- DELIBERATELY NO UPDATE. A column default only applies to new rows, which is
-- the whole point: 12 of the 17 existing profiles carry gallery=false, and
-- nothing here can tell the ones that never touched the toggle apart from the
-- ones that deliberately switched it off. None of those 12 currently has a
-- single creator_gallery photo, so leaving them alone hides nothing today —
-- their owners can turn the section on from the dashboard's Visibility tab.
--
-- No code change ships with this. /api/profiles (the only path that creates a
-- profile — there is no signup trigger) omits section_visibility entirely, so
-- the DB default is the sole origin. DashboardClient reads
-- `profile.section_visibility ?? {}`, and both the dashboard toggles and the
-- public profile page test `!== false`, so an empty object already means
-- "everything visible" — consistent with this new default either way.
