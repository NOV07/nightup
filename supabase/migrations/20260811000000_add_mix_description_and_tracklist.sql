-- Mix detail page: long-form fields the admin fills in by hand.
-- `description` was already read and rendered by app/nightwaves/mix/[id] but had
-- no column or form field behind it. `tracklist` is new and deliberately free
-- text — one track per line, rendered with white-space: pre-line — rather than
-- structured rows, so the admin keeps whatever format the source used.
-- Both nullable: existing mixes render exactly as they do today.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.mixes
  add column if not exists description text,
  add column if not exists tracklist text;
