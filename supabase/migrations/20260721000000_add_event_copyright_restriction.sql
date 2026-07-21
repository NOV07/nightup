-- Copyright fallback: flag events whose photo can't be shown (copyrighted/missing),
-- so the frontend can swap in a generic cover image instead.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.events add column if not exists has_copyright_restriction boolean not null default false;
