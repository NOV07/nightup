-- Part C of removing the `organizers` table. DESTRUCTIVE — run by hand, and only
-- after Part A has been applied and Part B verified.
--
-- Dependency check done before writing this (the lesson from the reviews /
-- professionals failure). Using PostgREST relationship probing, which only
-- resolves across real FK constraints:
--   * the ONLY foreign key on `organizers` is organizers.profile_id -> profiles.id,
--     which is OUTGOING — it drops with the table and blocks nothing
--   * events.organizer_id has NO foreign key. It is a plain uuid column, which is
--     why this will not fail the way DROP TABLE professionals did
--   * organizers had 0 rows and 0 events had organizer_id set
--
-- Confirm authoritatively before running — an embedding probe is strong evidence
-- but pg_constraint is the source of truth, and it also catches views:
--   SELECT conrelid::regclass AS dependent, conname
--   FROM pg_constraint WHERE confrelid = 'organizers'::regclass;
-- Expected: zero rows (nothing references organizers).

DROP TABLE IF EXISTS organizers;

-- The column the table backed. Never read by the public event page, never set on
-- any event; editorial events now carry editorial_owner_name instead.
ALTER TABLE events DROP COLUMN IF EXISTS organizer_id;

-- Defined in 20260711000000_add_view_tracking.sql as
--   update organizers set view_count = view_count + 1 where id = organizer_id
-- Its only caller was /organizers/[slug], deleted in Part B. PostgreSQL does not
-- track table dependencies for SQL-language functions, so this would survive the
-- DROP above as a silently broken function.
DROP FUNCTION IF EXISTS increment_organizer_views(uuid);
