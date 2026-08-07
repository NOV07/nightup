-- Optional mood tag on events, matching the MOODS keys used by app/spots/types.ts,
-- so events can surface correctly in "Βρες τη νύχτα σου".
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table events add column if not exists mood text
  check (mood is null or mood in ('chill', 'wild', 'food', 'diff'));
