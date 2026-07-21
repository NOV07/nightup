-- Site-wide image crop tool, Increment 4: crop fields for creator profile
-- avatar and cover images. Two separate crop boxes since avatar_url and
-- cover_url are different source images with different aspect ratios
-- (avatar ~1:1, cover wide). Fractional (0-1), relative to the original
-- uploaded image. Null means "no custom crop" — existing profiles render
-- exactly as they do today.
--
-- Scoped to profiles.avatar_url / profiles.cover_url only, per the task.
-- Does NOT touch professionals.image_url (a separate professional-specific
-- avatar override) or organizers.logo_url / organizers.cover_url (the
-- separate admin-curated organizers table, out of scope for the same
-- reason it was excluded from the creator_gallery feature: no authenticated
-- owner exists for that table).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.profiles
  add column if not exists avatar_crop_x real,
  add column if not exists avatar_crop_y real,
  add column if not exists avatar_crop_width real,
  add column if not exists avatar_crop_height real,
  add column if not exists cover_crop_x real,
  add column if not exists cover_crop_y real,
  add column if not exists cover_crop_width real,
  add column if not exists cover_crop_height real;
