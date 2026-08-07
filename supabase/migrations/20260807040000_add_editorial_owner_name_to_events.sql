-- Part A of removing the `organizers` table.
--
-- events.organizer_id pointed at a separate `organizers` table that is unrelated
-- to profiles/profile_type 'organizer'. The public event page never read it — it
-- renders the owner card from events.profile_id -> profiles — so the column was
-- dead. Editorial (admin-created, accountless) events need only a display name,
-- which this column provides.
--
-- Checked and NOT changed: music_releases.artist (13/13 populated), mixes.artist
-- (10/10) and artists.name are already free-text owner fields, so none of them
-- need an equivalent column.

ALTER TABLE events ADD COLUMN IF NOT EXISTS editorial_owner_name text;
