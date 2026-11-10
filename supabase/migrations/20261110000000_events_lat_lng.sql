-- events: συντεταγμένες για τον χάρτη /map.
-- Μόνο προσθήκη στηλών. Δεν αγγίζει υπάρχουσες γραμμές (lat/lng = NULL).
-- Χωρίς geo/PostGIS. Idempotent.
begin;

alter table public.events
  add column if not exists lat double precision,
  add column if not exists lng double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_lat_range_chk') then
    alter table public.events
      add constraint events_lat_range_chk check (lat is null or lat between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_lng_range_chk') then
    alter table public.events
      add constraint events_lng_range_chk check (lng is null or lng between -180 and 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_lat_lng_both_chk') then
    alter table public.events
      add constraint events_lat_lng_both_chk check ((lat is null) = (lng is null));
  end if;
end $$;

commit;

-- Έλεγχος μετά την εκτέλεση (δεν αλλάζει τίποτα):
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema='public' and table_name='events' and column_name in ('lat','lng');
--   select grantee, privilege_type, column_name
--     from information_schema.column_privileges
--    where table_schema='public' and table_name='events'
--      and column_name in ('lat','lng') and grantee in ('authenticated','anon');
--   (αν το δεύτερο δεν δείξει UPDATE/INSERT για authenticated, πες μου)
--
-- Rollback:
--   alter table public.events drop constraint events_lat_lng_both_chk,
--     drop constraint events_lat_range_chk, drop constraint events_lng_range_chk,
--     drop column lat, drop column lng;
