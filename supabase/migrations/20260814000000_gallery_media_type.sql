-- Gallery media types: let a gallery entry be a video, not just a photo.
--
-- NOTE: like the other files in this folder, this is provided for manual review
-- and execution in the Supabase SQL Editor. Nothing here runs automatically.
--
-- Scope check done before writing this. The original brief named four tables
-- (spots, professionals, organizers, and the table behind /party), but three of
-- those no longer exist:
--   * `professionals` was dropped in 20260807030000_drop_professionals.sql
--   * `organizers`    was dropped in 20260807050000_drop_organizers.sql
--   * /party and /organizers/[slug] were deleted (commits a4a18eb, dc1f8c4)
-- Professionals, organizers, artists and venues are all rows in `profiles` now,
-- and their galleries live in `creator_gallery`. So there are exactly two
-- gallery surfaces left, and each needs a different change: `spots.gallery` is
-- an array column, `creator_gallery` is one row per photo.
--
-- Both blocks below are non-destructive and re-runnable.


-- ── Table: spots ───────────────────────────────────────────────────────────
-- `spots.gallery` holds the whole gallery in one column. Turn each entry from a
-- bare URL string into {"url": ..., "type": "image"}.
--
-- The column's declared type is not recorded anywhere in this repo (spots has no
-- create-table migration here), so this branches on what is actually in the
-- database rather than assuming. Both branches are idempotent: entries that are
-- already objects are left exactly as they are.
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'spots' AND column_name = 'gallery';

  IF col_type IS NULL THEN
    RAISE NOTICE 'spots.gallery does not exist — skipping';

  ELSIF col_type = 'ARRAY' THEN
    -- text[] -> jsonb, wrapping every element. A NULL gallery stays NULL; an
    -- empty array becomes an empty json array rather than NULL.
    EXECUTE $sql$
      ALTER TABLE public.spots
        ALTER COLUMN gallery TYPE jsonb
        USING (
          CASE
            WHEN gallery IS NULL THEN NULL
            ELSE COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('url', g, 'type', 'image'))
                 FROM unnest(gallery) AS g
                WHERE g IS NOT NULL AND g <> ''),
              '[]'::jsonb
            )
          END
        )
    $sql$;
    RAISE NOTICE 'spots.gallery converted from text[] to jsonb';

  ELSIF col_type = 'jsonb' THEN
    -- Already jsonb: only rewrite rows that still contain bare string elements.
    UPDATE public.spots
    SET gallery = (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(e) = 'string'
            THEN jsonb_build_object('url', e #>> '{}', 'type', 'image')
          ELSE e
        END
      )
      FROM jsonb_array_elements(gallery) AS e
    )
    WHERE gallery IS NOT NULL
      AND jsonb_typeof(gallery) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(gallery) AS x
        WHERE jsonb_typeof(x) = 'string'
      );
    RAISE NOTICE 'spots.gallery was already jsonb — string entries wrapped';

  ELSE
    RAISE EXCEPTION 'spots.gallery has unexpected type %, aborting', col_type;
  END IF;
END $$;


-- ── Table: creator_gallery ─────────────────────────────────────────────────
-- This one is row-per-photo (see 20260722000000_creator_gallery.sql), not an
-- array column, so there is no string-to-object conversion to do. It gets two
-- new columns instead, which leaves display_order, the crop fields, the RLS
-- policies and the 12-item trigger cap untouched.
--
-- media_type defaults to 'image', so every existing row is already correct and
-- no backfill UPDATE is needed.
ALTER TABLE public.creator_gallery
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS poster_url text;

ALTER TABLE public.creator_gallery
  DROP CONSTRAINT IF EXISTS creator_gallery_media_type_check;
ALTER TABLE public.creator_gallery
  ADD CONSTRAINT creator_gallery_media_type_check
  CHECK (media_type IN ('image', 'video'));


-- ── Storage: gallery-media bucket ──────────────────────────────────────────
-- Shared by both surfaces, one subfolder per context (see
-- app/api/gallery/upload/route.ts). Uploads go through the service-role client,
-- which bypasses RLS, so only the public-read policy is actually required.
--
-- As the creator_gallery migration notes, this INSERT may be rejected depending
-- on project permissions. If it is, create the bucket by hand instead:
--   Storage -> New bucket -> name "gallery-media", Public bucket ON.
insert into storage.buckets (id, name, public)
values ('gallery-media', 'gallery-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to gallery media" on storage.objects;
create policy "Public read access to gallery media"
  on storage.objects for select
  using (bucket_id = 'gallery-media');
