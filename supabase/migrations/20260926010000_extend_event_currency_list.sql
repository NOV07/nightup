-- Widen events.currency to the non-eurozone European currencies alongside the
-- original three. Allowed values are mirrored by CURRENCIES in
-- app/lib/formatPrice.ts — keep the two in step.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL
-- Editor. Do not apply via automated migration runner without explicit
-- confirmation.
--
-- Run this BEFORE deploying the matching code: an event saved with one of the
-- new codes is rejected by the old constraint until this lands.

alter table public.events
  drop constraint if exists events_currency_check;

alter table public.events
  add constraint events_currency_check
  check (currency in ('EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'PLN'));
