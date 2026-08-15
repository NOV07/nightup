-- Atomic monthly visitor-count increment for site_stats, replacing the
-- select-then-update/insert pattern in app/api/track-visit/route.ts, which
-- can lose increments under concurrent requests (classic read-modify-write race).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

-- `on conflict (month)` needs a unique index on the column; safe/idempotent
-- to (re)create even if one already exists under a different name.
create unique index if not exists site_stats_month_key on public.site_stats (month);

create or replace function increment_site_visit(p_month text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into site_stats (month, visitor_count, updated_at)
  values (p_month, 1, now())
  on conflict (month) do update
    set visitor_count = site_stats.visitor_count + 1,
        updated_at = now();
$$;

grant execute on function increment_site_visit(text) to anon, authenticated;
