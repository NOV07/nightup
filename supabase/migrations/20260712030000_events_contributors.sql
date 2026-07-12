-- Professional (1/2): "Contributors" free-text field on events, mirrors `lineup`.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.events add column if not exists contributors text[];