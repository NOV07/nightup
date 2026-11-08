-- Spots: new subcategory list. Only normalize_spot_sub() changes.
--
-- No data is converted: no spot holds a removed key (checked by hand). This
-- only stops an OLD client that still sends a removed value ('sushi',
-- 'rooftop', 'live stage'...) from writing a removed key back, through the
-- sync_spot_taxonomy trigger. Mirrors normalizeSpotSub() in
-- app/lib/spotCategories.ts.
--
--   sushi, σούσι                         -> asian
--   creative                             -> restaurant
--   rooftop, rooftop bar, all-day bar,
--   shots bar, σφηνάδικο                 -> cocktail_bar
--   mainstream                           -> club
--   live stage, live music, live μουσική -> club, EXCEPT when the primary
--                                           category is 'show': then NULL (the
--                                           value is dropped, there is no such
--                                           subcategory under show any more)
--
-- To be run by hand in the Supabase SQL Editor. Idempotent.
-- PART 1 is read-only: it lists any constraint, index or function that holds a
-- list of subcategory keys (expected: only the 'spots_subcategories_valid'
-- row, which checks size/uniqueness and has no key list).

-- ─────────────── PART 1: is there a stored list of allowed keys? ───────────────
select 'constraint' as kind, conname as name, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.spots'::regclass
   and (pg_get_constraintdef(oid) ilike '%subcategor%' or pg_get_constraintdef(oid) ilike '%cocktail_bar%')
union all
select 'function', p.proname, left(pg_get_functiondef(p.oid), 200)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and pg_get_functiondef(p.oid) ~* '(rooftop_bar|all_day_bar|shots_bar|live_stage|cocktail_bar)'
union all
select 'trigger', tgname, pg_get_triggerdef(oid)
  from pg_trigger where tgrelid = 'public.spots'::regclass and not tgisinternal;

-- ─────────────── PART 2: the function ───────────────
create or replace function public.normalize_spot_sub(raw text, cat text default null)
returns text
language plpgsql
immutable
set search_path = public
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

  -- removed: 'live stage' / 'live music' -> club; dropped under show
  if c in ('livestage', 'livemusic', 'liveμουσικη') then
    return case when cat = 'show' then null else 'club' end;
  end if;

  return case c
    -- food
    when 'italian'        then 'italian'
    when 'ιταλικο'        then 'italian'
    when 'asian'          then 'asian'
    when 'ασιατικο'       then 'asian'
    when 'sushi'          then 'asian'        -- removed
    when 'σουσι'          then 'asian'        -- removed
    when 'mexican'        then 'mexican'
    when 'μεξικανικο'     then 'mexican'
    when 'restaurant'     then 'restaurant'
    when 'εστιατοριο'     then 'restaurant'
    when 'creative'       then 'restaurant'   -- removed
    when 'souvlaki'       then 'souvlaki'
    when 'σουβλακι'       then 'souvlaki'
    when 'burger'         then 'burger'
    when 'μπεργκερ'       then 'burger'
    when 'seafood'        then 'seafood'
    when 'θαλασσινα'      then 'seafood'
    when 'vegan'          then 'vegan'
    when 'meze'           then 'meze'
    when 'μεζεδοπωλειο'   then 'meze'
    when 'streetfood'     then 'street_food'
    when 'brunch'         then 'brunch'
    -- drink
    when 'cocktailbar'    then 'cocktail_bar'
    when 'winebar'        then 'wine_bar'
    when 'beerbar'        then 'beer_bar'
    when 'μπυραρια'       then 'beer_bar'
    when 'rakitsipouro'   then 'raki_tsipouro'
    when 'rakitsipourobar' then 'raki_tsipouro'
    when 'ρακαδικοτσιπουραδικο' then 'raki_tsipouro'
    when 'speakeasy'      then 'speakeasy'
    when 'rooftopbar'     then 'cocktail_bar' -- removed
    when 'rooftop'        then 'cocktail_bar' -- removed
    when 'alldaybar'      then 'cocktail_bar' -- removed
    when 'shotsbar'       then 'cocktail_bar' -- removed
    when 'σφηναδικο'      then 'cocktail_bar' -- removed
    -- nightlife
    when 'club'           then 'club'
    when 'karaoke'        then 'karaoke'
    when 'bouzoukia'      then 'bouzoukia'
    when 'μπουζουκιαλαικα' then 'bouzoukia'
    when 'bouzoukialaiko' then 'bouzoukia'
    when 'μπουζουκια'     then 'bouzoukia'
    when 'entechno'       then 'entechno'
    when 'εντεχνο'        then 'entechno'
    when 'underground'    then 'underground'
    when 'undergroundtechno' then 'underground'
    when 'disco'          then 'disco'
    when 'discoretro'     then 'disco'
    when 'rockmetal'      then 'rock_metal'
    when 'latin'          then 'latin'
    when 'hiphoprnb'      then 'hiphop_rnb'
    when 'hiphoprb'       then 'hiphop_rnb'
    when 'mainstream'     then 'club'         -- removed
    -- show
    when 'standupcomedy'  then 'stand_up'
    when 'standup'        then 'stand_up'
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
    when 'paintball'      then 'paintball'
    when 'lasertag'       then 'laser_tag'
    when 'airsoft'        then 'airsoft'
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

-- ─────────────── PART 3: quick check (read-only) ───────────────
-- Expected: asian, restaurant, cocktail_bar, cocktail_bar, club, club,
--           NULL, raki_tsipouro, hiphop_rnb, laser_tag, bouzoukia
select normalize_spot_sub('Sushi','food'), normalize_spot_sub('creative','food'),
       normalize_spot_sub('rooftop bar','drink'), normalize_spot_sub('shots_bar','drink'),
       normalize_spot_sub('mainstream','nightlife'), normalize_spot_sub('live stage','nightlife'),
       normalize_spot_sub('live stage','show'), normalize_spot_sub('raki_tsipouro','drink'),
       normalize_spot_sub('Hip hop / R&B','nightlife'), normalize_spot_sub('laser_tag','activity'),
       normalize_spot_sub('μπουζούκια','nightlife');
