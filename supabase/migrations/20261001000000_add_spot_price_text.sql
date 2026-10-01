-- Free-text price per person for spots (e.g. "15–30€"), shown as
-- "{price_text} / άτομο". price_level stays: existing spots keep rendering
-- "€".repeat(price_level) until someone fills in price_text.
-- The spots_nearby() RPC is deliberately left untouched, so its rows carry no
-- price_text and fall back to price_level.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL
-- Editor. Do not apply via automated migration runner without explicit
-- confirmation.

alter table public.spots
  add column if not exists price_text text;

-- Dropped first so re-running the file does not fail on an existing constraint.
alter table public.spots
  drop constraint if exists spots_price_text_length_check;

alter table public.spots
  add constraint spots_price_text_length_check check (char_length(price_text) <= 40);
