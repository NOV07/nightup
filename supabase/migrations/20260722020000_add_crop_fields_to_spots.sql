-- Site-wide image crop tool, Increment 3: crop fields for spot cover images.
-- Fractional (0-1) crop box relative to the original uploaded cover_image, so
-- the same source file can be re-cropped later without quality loss. Null
-- means "no custom crop" — existing spots render exactly as they do today.
--
-- Scoped to the cover_image field only. Does NOT touch the spots_nearby()
-- PostGIS RPC (see 20260712000000_spots_postgis_distance.sql) — that
-- function's return columns are fixed in its own definition, so nearby-search
-- results will not reflect a saved crop until/unless that RPC is separately
-- updated to select these new columns too.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.spots
  add column if not exists crop_x real,
  add column if not exists crop_y real,
  add column if not exists crop_width real,
  add column if not exists crop_height real;
