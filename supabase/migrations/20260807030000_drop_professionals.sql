-- Part E of unifying `professionals` into `profiles`. DESTRUCTIVE — run by hand,
-- and only after the Part B migration has been applied and verified.
--
-- Verified before writing this:
--   * no code in app/ or components/ references either table
--   * the 1 linked professionals row (SoundCrew) is fully migrated onto its
--     profile, gallery included; the other 9 rows are profile-less seed data
--     that was deliberately not migrated
--   * `reviews` is empty (0 rows), has no code references and no migration of
--     its own, and its only substantive column is professional_id — it exists
--     purely to review professionals and is meaningless without that table.
--     Dropping it rather than just dropping the FK, so no dead schema is left
--     behind. A future reviews feature would key on profile_id anyway.
--
-- Confirm the dependency list first:
--   SELECT conrelid::regclass, conname FROM pg_constraint
--   WHERE confrelid = 'professionals'::regclass;
-- Expected: exactly one row, reviews / reviews_professional_id_fkey.

-- Drop the dependent first so the FK goes with it — deliberately not using
-- DROP ... CASCADE, which would remove the constraint but strand `reviews`.
DROP TABLE IF EXISTS reviews;

DROP TABLE IF EXISTS professionals;
