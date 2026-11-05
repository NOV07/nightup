-- Spots: up to 3 categories and 3 subcategories, stable keys in the DB.
--
-- Adds spots.categories text[] and spots.subcategories text[] (GIN indexed).
-- The primary category is categories[1]; the legacy columns stay and are kept
-- in sync by the sync_spot_taxonomy trigger:
--     spots.category    = categories[1]      (enum spot_category)
--     spots.subcategory = subcategories[1]
-- Subcategory values are converted to the keys in app/lib/spotCategories.ts
-- (e.g. 'μεζεδοπωλείο' -> 'meze'). Category keys do not change.
--
-- Additive: no old column is dropped, so the current app keeps working. Two
-- things change under the old code, until the new code is deployed:
--   * spots.subcategory now holds the key ('meze'), not 'μεζεδοπωλείο', so the
--     old /spots sub-chip filter and label lookup no longer match it;
--   * spots_nearby() returns two extra columns (old code ignores them).
-- Old clients that still WRITE category/subcategory keep working: the trigger
-- turns a legacy single value into the arrays (see sync_spot_taxonomy()).
--
-- guard_spots_columns() (guard_protected_columns trigger) is a DENYLIST of
-- id, created_at, is_published, is_sponsored, featured, rating, slug, owner_id,
-- ... Neither new column is listed, so owners may write them (like category
-- today) and nothing in that function needs to change. The sync trigger is
-- named sync_spot_taxonomy so it fires AFTER guard_protected_columns
-- (BEFORE triggers run in alphabetical order).
--
-- To be run by hand in the Supabase SQL Editor, in three parts:
--   PART 1  functions                 (harmless, idempotent)
--   PART 2  preview SELECTs           (read-only; run before PART 3)
--   PART 3  backup + changes          (ONE transaction, incl. spots_nearby)
-- The full ROLLBACK is at the bottom (commented out: do not run it by accident).

-- ─────────────────────────── PART 1: functions ───────────────────────────

-- Mirrors normalizeSpotSub() in app/lib/spotCategories.ts: lowercase, trim,
-- strip accents, drop everything except letters and digits, look the result
-- up. Only 'live stage' depends on the category (nightlife -> live_stage,
-- show -> live_music). Unknown values are returned exactly as they came in.
create or replace function public.normalize_spot_sub(raw text, cat text default null)
returns text
language plpgsql
immutable
as $$
declare
  c text;
begin
  if raw is null or btrim(raw) = '' then
    return null;
  end if;

  c := translate(
         lower(btrim(raw)),
         'άέήίϊΐόύϋΰώéáíóú',
         'αεηιιιουυυωeaiou'
       );
  c := regexp_replace(c, '[^a-z0-9α-ω]', '', 'g');

  if c in ('livestage') then
    return case when cat = 'show' then 'live_music' else 'live_stage' end;
  end if;

  return case c
    -- food
    when 'σουβλακι'       then 'souvlaki'
    when 'souvlaki'       then 'souvlaki'
    when 'burger'         then 'burger'
    when 'μπεργκερ'       then 'burger'
    when 'σουσι'          then 'sushi'
    when 'sushi'          then 'sushi'
    when 'ιταλικο'        then 'italian'
    when 'italian'        then 'italian'
    when 'μεζεδοπωλειο'   then 'meze'
    when 'meze'           then 'meze'
    when 'brunch'         then 'brunch'
    when 'vegan'          then 'vegan'
    when 'θαλασσινα'      then 'seafood'
    when 'seafood'        then 'seafood'
    when 'creative'       then 'creative'
    when 'streetfood'     then 'street_food'
    -- drink
    when 'cocktailbar'    then 'cocktail_bar'
    when 'winebar'        then 'wine_bar'
    when 'rooftopbar'     then 'rooftop_bar'
    when 'rooftop'        then 'rooftop_bar'
    when 'alldaybar'      then 'all_day_bar'
    when 'μπυραρια'       then 'beer_bar'
    when 'beerbar'        then 'beer_bar'
    when 'σφηναδικο'      then 'shots_bar'
    when 'shotsbar'       then 'shots_bar'
    -- nightlife
    when 'club'           then 'club'
    when 'underground'    then 'underground'
    when 'undergroundtechno' then 'underground'
    when 'mainstream'     then 'mainstream'
    when 'μπουζουκια'     then 'bouzoukia'
    when 'bouzoukia'      then 'bouzoukia'
    when 'disco'          then 'disco'
    when 'discoretro'     then 'disco'
    -- show
    when 'standupcomedy'  then 'stand_up'
    when 'standup'        then 'stand_up'
    when 'liveμουσικη'    then 'live_music'
    when 'livemusic'      then 'live_music'
    when 'θεατρο'         then 'theatre'
    when 'theatre'        then 'theatre'
    when 'σινεμα'         then 'cinema'
    when 'cinema'         then 'cinema'
    when 'performance'    then 'performance'
    -- chill
    when 'specialtyκαφε'  then 'specialty_coffee'
    when 'specialtycoffee' then 'specialty_coffee'
    when 'alldaycafe'     then 'all_day_cafe'
    when 'γλυκο'          then 'dessert'
    when 'dessert'        then 'dessert'
    when 'τσαι'           then 'tea'
    when 'tea'            then 'tea'
    when 'teabrunch'      then 'tea'
    when 'τσαιbrunch'     then 'tea'
    -- activity
    when 'escaperoom'     then 'escape_room'
    when 'bowling'        then 'bowling'
    when 'boardgamecafe'  then 'board_games'
    when 'boardgames'     then 'board_games'
    when 'μπιλιαρδο'      then 'billiards'
    when 'billiards'      then 'billiards'
    when 'καρτ'           then 'karting'
    when 'karting'        then 'karting'
    when 'arcade'         then 'arcade'
    when 'minigolfarcade' then 'arcade'
    -- art
    when 'μουσειο'        then 'museum'
    when 'museum'         then 'museum'
    when 'artgallery'     then 'art_gallery'
    when 'βιβλιοπωλειο'   then 'bookstore'
    when 'bookstore'      then 'bookstore'
    when 'bookstorereading' then 'bookstore'
    -- wellness
    when 'sunsetspot'     then 'sunset_spot'
    when 'yoga'           then 'yoga'
    when 'yogameditation' then 'yoga'
    when 'θαλασσια'       then 'sea_swim'
    when 'seaswim'        then 'sea_swim'
    when 'φυση'           then 'nature_walk'
    when 'naturewalk'     then 'nature_walk'
    else raw              -- unknown: leave exactly as is
  end;
end;
$$;

-- true when the array has no repeated element (NULL elements count as repeats
-- of each other). Needed because a CHECK constraint cannot contain a subquery.
create or replace function public.spot_array_is_unique(arr text[])
returns boolean
language sql
immutable
as $$
  select arr is null
      or cardinality(arr) = (select count(distinct x) from unnest(arr) as x)
$$;

-- Keeps the legacy columns and the arrays consistent, BEFORE INSERT OR UPDATE.
--   * New clients write categories/subcategories; the legacy columns are then
--     overwritten with categories[1] / subcategories[1].
--   * Old clients write only category/subcategory. If the matching array was
--     not touched, the legacy value is merged in: it becomes the first element
--     (converted to a key for subcategory) and the other elements are kept.
-- Not SECURITY DEFINER: it only touches the row being written.
create or replace function public.sync_spot_taxonomy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  n text;
begin
  if tg_op = 'INSERT' then
    if new.categories is null or cardinality(new.categories) = 0 then
      if new.category is not null then
        new.categories := array[new.category::text];
      end if;
    end if;
    if new.subcategories is null then
      new.subcategories := '{}';
    end if;
    if cardinality(new.subcategories) = 0 and new.subcategory is not null
       and btrim(new.subcategory) <> '' then
      new.subcategories := array[public.normalize_spot_sub(new.subcategory, new.categories[1])];
    end if;
  else
    -- legacy write to category: categories untouched, category changed
    if new.categories is not distinct from old.categories
       and new.category is distinct from old.category then
      new.categories := (array[new.category::text]
                         || array_remove(old.categories, new.category::text))[1:3];
    end if;
    -- legacy write to subcategory: subcategories untouched, subcategory changed
    if new.subcategories is not distinct from old.subcategories
       and new.subcategory is distinct from old.subcategory then
      n := public.normalize_spot_sub(new.subcategory, coalesce(new.categories[1], new.category::text));
      if n is null then
        new.subcategories := '{}';
      else
        new.subcategories := (array[n] || array_remove(old.subcategories, n))[1:3];
      end if;
    end if;
    if new.subcategories is null then
      new.subcategories := '{}';
    end if;
  end if;

  -- The legacy columns always mirror the first element.
  if new.categories is not null and cardinality(new.categories) > 0 then
    new.category := new.categories[1]::spot_category;
  end if;
  new.subcategory := new.subcategories[1];

  return new;
end;
$$;

-- ─────────────────── PART 2: preview (read-only, run me first) ───────────────────

-- Every spot, before -> after. Expected today (1 row): food / μεζεδοπωλείο
-- -> categories {food}, subcategories {meze}, subcategory meze.
select id, name,
       category::text                                   as category_before,
       subcategory                                      as subcategory_before,
       array[category::text]                            as categories_after,
       case when subcategory is null or btrim(subcategory) = '' then '{}'::text[]
            else array[public.normalize_spot_sub(subcategory, category::text)] end as subcategories_after
  from public.spots
 order by name;

-- Subcategory values the function does not recognise (they would stay as they
-- are, and the app would treat them as unknown). Expected: zero rows.
select id, name, category::text, subcategory
  from public.spots
 where subcategory is not null and btrim(subcategory) <> ''
   and public.normalize_spot_sub(subcategory, category::text) = subcategory
   and subcategory <> all (array[
     'souvlaki','burger','sushi','italian','meze','brunch','vegan','seafood','creative','street_food',
     'cocktail_bar','wine_bar','rooftop_bar','all_day_bar','beer_bar','shots_bar',
     'club','underground','mainstream','live_stage','bouzoukia','disco',
     'stand_up','live_music','theatre','cinema','performance',
     'specialty_coffee','all_day_cafe','dessert','tea',
     'escape_room','bowling','board_games','billiards','karting','arcade',
     'museum','art_gallery','bookstore',
     'sunset_spot','yoga','sea_swim','nature_walk']);

-- Safety: the migration must not already have run.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'spots'
   and column_name in ('categories', 'subcategories');   -- expected: zero rows

-- ─────────────────── PART 3: backup + changes (one transaction) ───────────────────

begin;

set local lock_timeout = '5s';   -- fail fast instead of queueing behind traffic

-- Backup of the two legacy columns (everything else is unchanged by this
-- migration). RLS on with NO policies, and no table privileges for the API
-- roles: only the postgres role / service role can read it.
create table if not exists public._spot_taxonomy_migration_backup (
  id          uuid primary key,
  category    text,
  subcategory text,
  backed_up_at timestamptz not null default now()
);
alter table public._spot_taxonomy_migration_backup enable row level security;
revoke all on public._spot_taxonomy_migration_backup from public, anon, authenticated;

insert into public._spot_taxonomy_migration_backup (id, category, subcategory)
select id, category::text, subcategory from public.spots
on conflict (id) do nothing;

-- New columns. categories is nullable until the backfill, then NOT NULL.
alter table public.spots
  add column categories    text[],
  add column subcategories text[] not null default '{}';

-- Backfill. The sync trigger does not exist yet, so the legacy columns are
-- set here explicitly.
update public.spots
   set categories    = array[category::text],
       subcategories = case when subcategory is null or btrim(subcategory) = '' then '{}'::text[]
                            else array[public.normalize_spot_sub(subcategory, category::text)] end;

update public.spots
   set subcategory = subcategories[1];

alter table public.spots alter column categories set not null;

-- Constraints.
alter table public.spots
  add constraint spots_categories_valid check (
    cardinality(categories) between 1 and 3
    and categories <@ array['food','drink','nightlife','show','chill','activity','art','wellness']::text[]
    and public.spot_array_is_unique(categories)
  ),
  add constraint spots_primary_category_first check (category::text = categories[1]),
  add constraint spots_subcategories_valid check (
    cardinality(subcategories) <= 3
    and public.spot_array_is_unique(subcategories)
  ),
  add constraint spots_subcategory_first check (subcategory is not distinct from subcategories[1]);

-- Indexes (idx_spots_category on the legacy column stays).
create index idx_spots_categories_gin    on public.spots using gin (categories);
create index idx_spots_subcategories_gin on public.spots using gin (subcategories);

-- Sync trigger. Name sorts after guard_protected_columns, so the guard sees
-- the row first and this trigger normalises what the guard let through.
create trigger sync_spot_taxonomy
  before insert or update on public.spots
  for each row execute function public.sync_spot_taxonomy();

-- spots_nearby: the return type changes, so drop + create (same transaction).
-- Same body, security definer, stable and search_path as the live function;
-- two new columns, and the category filter now matches any of the categories.
drop function if exists public.spots_nearby(double precision, double precision, double precision, text);

create function public.spots_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision,
  filter_category text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  category spot_category,
  subcategory text,
  categories text[],
  subcategories text[],
  city text,
  neighborhood text,
  address text,
  lat double precision,
  lng double precision,
  description text,
  cover_image text,
  price_level smallint,
  rating numeric,
  instagram text,
  is_sponsored boolean,
  featured boolean,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    s.id, s.name, s.slug, s.category, s.subcategory, s.categories, s.subcategories,
    s.city, s.neighborhood,
    s.address, s.lat, s.lng, s.description, s.cover_image, s.price_level,
    s.rating, s.instagram, s.is_sponsored, s.featured,
    ST_Distance(s.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_m
  from public.spots s
  where s.is_published = true
    and s.geo is not null
    and ST_DWithin(s.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
    and (filter_category is null or filter_category = any(s.categories))
  order by s.is_sponsored desc, distance_m asc;
$$;

-- Same grants as the live function: PUBLIC, postgres, anon, authenticated, service_role.
grant execute on function public.spots_nearby(double precision, double precision, double precision, text)
  to public, postgres, anon, authenticated, service_role;

-- Post-check (inside the transaction; read it before the commit goes through).
select id, name, category::text, subcategory, categories, subcategories from public.spots;

commit;

-- ─────────────────────────── ROLLBACK (full) ───────────────────────────
-- Only table touched: public.spots. Run as one block. Uncomment to use.
--
-- begin;
-- set local lock_timeout = '5s';
--
-- drop trigger if exists sync_spot_taxonomy on public.spots;
-- drop function if exists public.sync_spot_taxonomy();
--
-- alter table public.spots
--   drop constraint if exists spots_categories_valid,
--   drop constraint if exists spots_primary_category_first,
--   drop constraint if exists spots_subcategories_valid,
--   drop constraint if exists spots_subcategory_first;
--
-- drop index if exists public.idx_spots_categories_gin;
-- drop index if exists public.idx_spots_subcategories_gin;
--
-- -- Restore the legacy values from the backup (trigger and constraints are gone).
-- update public.spots s
--    set category    = b.category::spot_category,
--        subcategory = b.subcategory
--   from public._spot_taxonomy_migration_backup b
--  where b.id = s.id;
--
-- alter table public.spots
--   drop column if exists categories,
--   drop column if exists subcategories;
--
-- -- Original spots_nearby (live definition before this migration).
-- drop function if exists public.spots_nearby(double precision, double precision, double precision, text);
--
-- create function public.spots_nearby(
--   user_lat double precision,
--   user_lng double precision,
--   radius_km double precision,
--   filter_category text default null
-- )
-- returns table (
--   id uuid, name text, slug text, category spot_category, subcategory text,
--   city text, neighborhood text, address text,
--   lat double precision, lng double precision, description text, cover_image text,
--   price_level smallint, rating numeric, instagram text,
--   is_sponsored boolean, featured boolean, distance_m double precision
-- )
-- language sql
-- stable
-- security definer
-- set search_path = public, extensions
-- as $fn$
--   select
--     s.id, s.name, s.slug, s.category, s.subcategory, s.city, s.neighborhood,
--     s.address, s.lat, s.lng, s.description, s.cover_image, s.price_level,
--     s.rating, s.instagram, s.is_sponsored, s.featured,
--     ST_Distance(s.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_m
--   from public.spots s
--   where s.is_published = true
--     and s.geo is not null
--     and ST_DWithin(s.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
--     and (filter_category is null or s.category::text = filter_category)
--   order by s.is_sponsored desc, distance_m asc;
-- $fn$;
--
-- grant execute on function public.spots_nearby(double precision, double precision, double precision, text)
--   to public, postgres, anon, authenticated, service_role;
--
-- drop function if exists public.spot_array_is_unique(text[]);
-- drop function if exists public.normalize_spot_sub(text, text);
-- drop table if exists public._spot_taxonomy_migration_backup;
--
-- commit;
