-- Spots Phase 2 (1/3): PostGIS distance queries for "Βρες τη νύχτα σου" (Tonight).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

create extension if not exists postgis;

alter table public.spots
  add column if not exists geo geography(Point, 4326)
  generated always as (
    case
      when lat is not null and lng is not null
        then ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      else null
    end
  ) stored;

create index if not exists idx_spots_geo on public.spots using gist (geo);

create or replace function spots_nearby(
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
set search_path = public
as $$
  select
    s.id, s.name, s.slug, s.category, s.subcategory, s.city, s.neighborhood,
    s.address, s.lat, s.lng, s.description, s.cover_image, s.price_level,
    s.rating, s.instagram, s.is_sponsored, s.featured,
    ST_Distance(s.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_m
  from public.spots s
  where s.is_published = true
    and s.geo is not null
    and ST_DWithin(s.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
    and (filter_category is null or s.category::text = filter_category)
  order by s.is_sponsored desc, distance_m asc;
$$;

grant execute on function spots_nearby(double precision, double precision, double precision, text) to anon, authenticated;
