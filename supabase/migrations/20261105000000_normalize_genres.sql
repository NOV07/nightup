-- Genres: stable keys in the DB, Greek labels only on screen.
--
-- Converts every stored genre to the keys defined in app/lib/genres.ts
-- (techno, house, deep_house, drum_and_bass, hip_hop, rnb, laika, rebetiko,
-- entechno, dimotika, ...). Unknown values are left exactly as they are.
-- Also backfills events.genre (legacy singular column) from genres[1].
--
-- normalize_genre() mirrors normalizeGenre() in app/lib/genres.ts: lowercase,
-- trim, strip accents/diaeresis, drop everything except letters and digits,
-- then look the result up. Keep the two in sync.
--
-- Tables/columns: events.genre, events.genres, music_releases.primary_genre,
-- music_releases.secondary_genres, mixes.genre, profiles.genres, artists.genres.
--
-- To be run by hand in the Supabase SQL Editor, in three parts:
--   PART 1  functions                 (harmless, idempotent)
--   PART 2  preview SELECTs           (read-only: before -> after per row)
--   PART 3  backup + updates          (one transaction)
--
-- Rollback (PART 3 stores the old values):
--   update events set genre = (old->>'genre'), genres = array(select jsonb_array_elements_text(old->'genres'))
--     from public._genre_migration_backup b where b.tbl = 'events' and b.id = events.id::text;
--   (same pattern for the other tables; then drop table public._genre_migration_backup;)

-- ─────────────────────────── PART 1: functions ───────────────────────────

create or replace function public.normalize_genre(raw text)
returns text
language plpgsql
immutable
as $$
declare
  c text;
begin
  if raw is null then
    return null;
  end if;

  -- lowercase, strip accents / diaeresis (Greek and Latin), keep letters+digits only
  c := translate(
         lower(btrim(raw)),
         'άέήίϊΐόύϋΰώïáéíóú',
         'αεηιιιουυυωiaeiou'
       );
  c := regexp_replace(c, '[^a-z0-9α-ω]', '', 'g');

  return case c
    when 'techno'        then 'techno'
    when 'house'         then 'house'
    when 'deephouse'     then 'deep_house'
    when 'minimal'       then 'minimal'
    when 'drumbass'      then 'drum_and_bass'
    when 'drumandbass'   then 'drum_and_bass'
    when 'trance'        then 'trance'
    when 'hiphop'        then 'hip_hop'
    when 'rnb'           then 'rnb'
    when 'rb'            then 'rnb'
    when 'afrobeats'     then 'afrobeats'
    when 'reggaeton'     then 'reggaeton'
    when 'latin'         then 'latin'
    when 'pop'           then 'pop'
    when 'rock'          then 'rock'
    when 'jazz'          then 'jazz'
    when 'classical'     then 'classical'
    when 'κλασικη'       then 'classical'
    when 'blues'         then 'blues'
    when 'electronic'    then 'electronic'
    when 'ambient'       then 'ambient'
    when 'experimental'  then 'experimental'
    when 'reggae'        then 'reggae'
    when 'laika'         then 'laika'
    when 'λαικα'         then 'laika'
    when 'λαικο'         then 'laika'
    when 'entechno'      then 'entechno'
    when 'εντεχνο'       then 'entechno'
    when 'εντεχνα'       then 'entechno'
    when 'rebetiko'      then 'rebetiko'
    when 'rebetika'      then 'rebetiko'
    when 'ρεμπετικο'     then 'rebetiko'
    when 'ρεμπετικα'     then 'rebetiko'
    when 'dimotika'      then 'dimotika'
    when 'δημοτικα'      then 'dimotika'
    when 'δημοτικο'      then 'dimotika'
    when 'openair'       then 'open_air'
    when 'other'         then 'other'
    when 'αλλο'          then 'other'
    else raw             -- unknown: leave exactly as is
  end;
end;
$$;

-- Normalises every element, keeps first-seen order, drops duplicates.
create or replace function public.normalize_genre_array(arr text[])
returns text[]
language sql
immutable
as $$
  select case
    when arr is null then null
    else coalesce(
      (select array_agg(g order by first_pos)
         from (select public.normalize_genre(x) as g, min(ord) as first_pos
                 from unnest(arr) with ordinality as t(x, ord)
                group by 1) s),
      '{}'::text[])
  end;
$$;

-- ─────────────────── PART 2: preview (read-only, run me first) ───────────────────

-- events: genre + genres (genre falls back to the first genre when NULL)
select id, title,
       genre  as genre_before,  coalesce(public.normalize_genre(genre), (public.normalize_genre_array(genres))[1]) as genre_after,
       genres as genres_before, public.normalize_genre_array(genres) as genres_after
  from public.events
 where genre  is distinct from coalesce(public.normalize_genre(genre), (public.normalize_genre_array(genres))[1])
    or genres is distinct from public.normalize_genre_array(genres);

select id, title, primary_genre as before_primary, public.normalize_genre(primary_genre) as after_primary,
       secondary_genres as before_secondary, public.normalize_genre_array(secondary_genres) as after_secondary
  from public.music_releases
 where primary_genre    is distinct from public.normalize_genre(primary_genre)
    or secondary_genres is distinct from public.normalize_genre_array(secondary_genres);

select id, title, genre as before, public.normalize_genre(genre) as after
  from public.mixes
 where genre is distinct from public.normalize_genre(genre);

select id, username, genres as before, public.normalize_genre_array(genres) as after
  from public.profiles
 where genres is distinct from public.normalize_genre_array(genres);

select id, name, genres as before, public.normalize_genre_array(genres) as after
  from public.artists
 where genres is distinct from public.normalize_genre_array(genres);

-- Values the function does not recognise (they stay as they are):
select 'events.genres' as src, g, count(*) from public.events, unnest(genres) g
 where public.normalize_genre(g) = g and g <> all (array['techno','house','deep_house','minimal','drum_and_bass','trance','hip_hop','rnb','afrobeats','reggaeton','latin','pop','rock','jazz','classical','blues','electronic','ambient','experimental','reggae','laika','entechno','rebetiko','dimotika','open_air','other']) group by 1,2
union all
select 'events.genre', genre, count(*) from public.events
 where genre is not null and public.normalize_genre(genre) = genre and genre <> all (array['techno','house','deep_house','minimal','drum_and_bass','trance','hip_hop','rnb','afrobeats','reggaeton','latin','pop','rock','jazz','classical','blues','electronic','ambient','experimental','reggae','laika','entechno','rebetiko','dimotika','open_air','other']) group by 1,2
union all
select 'mixes.genre', genre, count(*) from public.mixes
 where genre is not null and public.normalize_genre(genre) = genre and genre <> all (array['techno','house','deep_house','minimal','drum_and_bass','trance','hip_hop','rnb','afrobeats','reggaeton','latin','pop','rock','jazz','classical','blues','electronic','ambient','experimental','reggae','laika','entechno','rebetiko','dimotika','open_air','other']) group by 1,2
union all
select 'profiles.genres', g, count(*) from public.profiles, unnest(genres) g
 where public.normalize_genre(g) = g and g <> all (array['techno','house','deep_house','minimal','drum_and_bass','trance','hip_hop','rnb','afrobeats','reggaeton','latin','pop','rock','jazz','classical','blues','electronic','ambient','experimental','reggae','laika','entechno','rebetiko','dimotika','open_air','other']) group by 1,2;

-- ─────────────────── PART 3: backup + updates (one transaction) ───────────────────

begin;

create table if not exists public._genre_migration_backup (
  tbl text not null,
  id  text not null,
  old jsonb not null,
  primary key (tbl, id)
);

-- events: normalise genres[], normalise genre, then backfill NULL genre from genres[1]
insert into public._genre_migration_backup (tbl, id, old)
select 'events', id::text, jsonb_build_object('genre', genre, 'genres', to_jsonb(genres))
  from public.events
 where genre  is distinct from coalesce(public.normalize_genre(genre), (public.normalize_genre_array(genres))[1])
    or genres is distinct from public.normalize_genre_array(genres)
on conflict do nothing;

update public.events
   set genres = public.normalize_genre_array(genres),
       genre  = coalesce(public.normalize_genre(genre), (public.normalize_genre_array(genres))[1])
 where genre  is distinct from coalesce(public.normalize_genre(genre), (public.normalize_genre_array(genres))[1])
    or genres is distinct from public.normalize_genre_array(genres);

-- music_releases
insert into public._genre_migration_backup (tbl, id, old)
select 'music_releases', id::text, jsonb_build_object('primary_genre', primary_genre, 'secondary_genres', to_jsonb(secondary_genres))
  from public.music_releases
 where primary_genre    is distinct from public.normalize_genre(primary_genre)
    or secondary_genres is distinct from public.normalize_genre_array(secondary_genres)
on conflict do nothing;

update public.music_releases
   set primary_genre    = public.normalize_genre(primary_genre),
       secondary_genres = public.normalize_genre_array(secondary_genres)
 where primary_genre    is distinct from public.normalize_genre(primary_genre)
    or secondary_genres is distinct from public.normalize_genre_array(secondary_genres);

-- mixes
insert into public._genre_migration_backup (tbl, id, old)
select 'mixes', id::text, jsonb_build_object('genre', genre)
  from public.mixes
 where genre is distinct from public.normalize_genre(genre)
on conflict do nothing;

update public.mixes
   set genre = public.normalize_genre(genre)
 where genre is distinct from public.normalize_genre(genre);

-- profiles
insert into public._genre_migration_backup (tbl, id, old)
select 'profiles', id::text, jsonb_build_object('genres', to_jsonb(genres))
  from public.profiles
 where genres is distinct from public.normalize_genre_array(genres)
on conflict do nothing;

update public.profiles
   set genres = public.normalize_genre_array(genres)
 where genres is distinct from public.normalize_genre_array(genres);

-- artists
insert into public._genre_migration_backup (tbl, id, old)
select 'artists', id::text, jsonb_build_object('genres', to_jsonb(genres))
  from public.artists
 where genres is distinct from public.normalize_genre_array(genres)
on conflict do nothing;

update public.artists
   set genres = public.normalize_genre_array(genres)
 where genres is distinct from public.normalize_genre_array(genres);

-- Row counts per table (what the transaction changed)
select tbl, count(*) as rows_changed from public._genre_migration_backup group by tbl order by tbl;

commit;
