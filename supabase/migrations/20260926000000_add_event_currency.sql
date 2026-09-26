-- Currency for events.price. The price column stays numeric — the symbol is
-- never stored alongside the amount, which is what broke admin save/approve
-- when a form sent "€22" into a numeric column.
-- Allowed values are mirrored by CURRENCIES in app/lib/formatPrice.ts.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL
-- Editor. Do not apply via automated migration runner without explicit
-- confirmation.

alter table public.events
  add column if not exists currency text not null default 'EUR';

-- Dropped first so re-running the file does not fail on an existing constraint.
alter table public.events
  drop constraint if exists events_currency_check;

alter table public.events
  add constraint events_currency_check check (currency in ('EUR', 'USD', 'GBP'));
