-- Wellness spots: subcategories (up to 3), same keys as the Wellness category in
-- app/lib/spotCategories.ts: sunset_spot, yoga, sea_swim, nature_walk.
-- The allowed values are checked by the API (app/lib/wellnessSpots.ts); the DB
-- checks size and uniqueness, like spots.subcategories.
--
-- To be run by hand in the Supabase SQL Editor. Idempotent: running it twice is
-- harmless, and the seed update never overwrites a spot that already has
-- subcategories (so anything set from the admin panel is kept).
--
-- Requires public.spot_array_is_unique(text[]) from 20261105010000_spot_categories.sql.

begin;

alter table public.wellness_spots
  add column if not exists subcategories text[] not null default '{}';

alter table public.wellness_spots
  drop constraint if exists wellness_spots_subcategories_valid;
alter table public.wellness_spots
  add constraint wellness_spots_subcategories_valid check (
    cardinality(subcategories) <= 3
    and public.spot_array_is_unique(subcategories)
  );

-- Seed spots (by slug). Petralona Dexameni and Pantheon/Aigaleo slope stay
-- empty on purpose: they are set from the admin panel.
update public.wellness_spots w
   set subcategories = v.subs
  from (values
    ('strefi-hill',               array['sunset_spot']),
    ('philopappou-hill',          array['sunset_spot','nature_walk']),
    ('anafiotika',                array[]::text[]),
    ('lycabettus',                array['sunset_spot','nature_walk']),
    ('areios-pagos',              array['sunset_spot']),
    ('hymettus-analipsi',         array['nature_walk']),
    ('tourkovounia',              array['sunset_spot','nature_walk']),
    ('veikou-grove',              array['nature_walk']),
    ('petroupoli-theatro-petras', array['nature_walk','sunset_spot']),
    ('kastella',                  array['sunset_spot']),
    ('penteli-observatory',       array['sunset_spot']),
    ('petralona-dexameni',        array[]::text[]),
    ('pantheon-aigaleo-slope',    array[]::text[]),
    ('merkouri-square',           array[]::text[])
  ) as v(slug, subs)
 where w.slug = v.slug
   and cardinality(w.subcategories) = 0;

-- Check (read-only): 14 rows; 10 with subcategories, 4 empty.
select slug, subcategories from public.wellness_spots order by slug;

commit;
