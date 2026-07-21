-- Site-wide image crop tool, Increment 2: crop fields for event cover images.
-- Fractional (0-1) crop box relative to the original uploaded image, so the
-- same source file can be re-cropped later without quality loss. Null means
-- "no custom crop" — existing events render exactly as they do today.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.events
  add column if not exists crop_x real,
  add column if not exists crop_y real,
  add column if not exists crop_width real,
  add column if not exists crop_height real;
