-- Phase 1: add professional network taxonomy columns to profiles
-- These three columns mirror the NETWORK constant in app/lib/searchData.ts
-- All nullable — existing rows are left as null; values are set in Phase 2 via the dashboard.

alter table profiles
  add column if not exists network_tab         text default null,
  add column if not exists network_category    text default null,
  add column if not exists network_subcategory text default null;

-- Ensure network_tab only ever holds one of the two valid section names (or null)
alter table profiles
  add constraint profiles_network_tab_check
  check (
    network_tab is null
    or network_tab in ('Plan Your Event', 'For Artists')
  );

-- Composite index for the SearchBar Network tab filter:
-- /network?tab=plan-your-event&category=Venues&subcategory=Clubs&city=Athens
create index if not exists idx_profiles_network
  on profiles (network_tab, network_category, network_subcategory);
