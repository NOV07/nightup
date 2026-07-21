-- Site-wide image crop tool, Increment 5: crop fields for creator_gallery photos.
-- Fractional (0-1) crop box relative to the original uploaded image_url. Null
-- means "no custom crop" — existing gallery photos render exactly as they do
-- today. One crop box per row (each row is already a single photo, unlike
-- events/spots/profiles which needed to pick one representative aspect ratio
-- across multiple placements).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.creator_gallery
  add column if not exists crop_x real,
  add column if not exists crop_y real,
  add column if not exists crop_width real,
  add column if not exists crop_height real;
