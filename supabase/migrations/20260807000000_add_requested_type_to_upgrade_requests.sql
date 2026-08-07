-- upgrade_requests stores the free-text `specialty` the user typed, but never the
-- structured profile type they picked in UpgradeModal. Approval therefore only ever
-- set plan_tier = 'creator' and left profile_type = 'user'.
-- Add the structured column so approval can set profile_type too.
--
-- Note: the upgrade_requests and profiles tables were created directly in the
-- Supabase dashboard and have no migration files. These changes are tracked here.

ALTER TABLE upgrade_requests ADD COLUMN IF NOT EXISTS requested_type text;

-- profiles.profile_type is the enum `profile_type`, whose labels are currently
-- (user, organizer, artist, professional, venue). 'spot' is a selectable tile in
-- UpgradeModal, so without this the approval below fails with 22P02.
-- Run this statement on its own: Postgres forbids using a new enum label in the
-- same transaction that adds it.
ALTER TYPE profile_type ADD VALUE IF NOT EXISTS 'spot';

-- Backfill nothing: rows submitted before this migration have no reliable structured
-- type (specialty is free text and may be localised). They stay NULL and the approval
-- route skips the profile_type update for them.
