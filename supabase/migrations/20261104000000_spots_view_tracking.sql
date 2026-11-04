-- View tracking for spots, plus one spot per owner account.
--
-- Already applied by hand in the production Supabase SQL Editor; this file
-- is the record. Safe to re-run (if not exists / create or replace).
-- NOTE: run the ALTER TABLE and the CREATE FUNCTION as separate statements.

-- 1) Column.
alter table public.spots add column if not exists view_count integer not null default 0;

-- 2) One spot per owner account (NULL owner_id, i.e. admin-added spots, is unconstrained).
create unique index if not exists spots_owner_id_unique
  on public.spots (owner_id)
  where owner_id is not null;

-- 3) Atomic increment, callable by anon/authenticated without granting write access.
create or replace function public.increment_spot_views(p_spot_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.spots set view_count = view_count + 1 where id = p_spot_id;
$$;

grant execute on function public.increment_spot_views(uuid) to anon, authenticated;
