-- Part B of unifying `professionals` into `profiles`.
--
-- Scope, from inspecting the live table (10 rows):
--   * 9 rows have profile_id IS NULL. They are an unpublished seed batch (all
--     created in the same second, stock photos, fabricated ratings) with no
--     profile to migrate into. Deliberately not migrated — they are discarded
--     with the table in Part E.
--   * 1 row (SoundCrew Athens -> @nightup_soundcrew) is linked. Its profile
--     already carries bio, location, booking_email, is_available and the
--     correct network_tab; only phone, tags, professional_status and the
--     gallery still need moving.
--
-- Written to be re-runnable: every column is guarded so a second run cannot
-- overwrite a value the profile owner has since set directly.

-- ── 1. Copy the linked professionals rows onto their profiles ───────────────
UPDATE profiles p
SET
  phone               = COALESCE(p.phone, pr.phone),
  tags                = CASE WHEN p.tags IS NULL OR p.tags = '{}' THEN pr.tags ELSE p.tags END,
  booking_email       = COALESCE(p.booking_email, pr.email),
  professional_status = pr.status,
  network_tab         = 'Professionals',
  network_category    = COALESCE(p.network_category, pr.category),
  is_available        = CASE
                          WHEN pr.availability = 'available' THEN true
                          WHEN pr.availability = 'busy'      THEN false
                          ELSE p.is_available
                        END,
  facebook            = COALESCE(p.facebook, pr.facebook),
  tiktok              = COALESCE(p.tiktok, pr.tiktok),
  youtube_url         = COALESCE(p.youtube_url, pr.youtube),
  soundcloud_url      = COALESCE(p.soundcloud_url, pr.soundcloud),
  spotify_url         = COALESCE(p.spotify_url, pr.spotify),
  website             = COALESCE(p.website, pr.website),
  instagram           = COALESCE(p.instagram, pr.instagram)
FROM professionals pr
WHERE pr.profile_id = p.id;

-- ── 2. Move galleries into creator_gallery (skip any already present) ───────
INSERT INTO creator_gallery (profile_id, image_url, display_order)
SELECT pr.profile_id, g.image_url, g.ord - 1
FROM professionals pr
CROSS JOIN LATERAL unnest(pr.gallery) WITH ORDINALITY AS g(image_url, ord)
WHERE pr.profile_id IS NOT NULL
  AND pr.gallery IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM creator_gallery cg
    WHERE cg.profile_id = pr.profile_id AND cg.image_url = g.image_url
  );

-- ── 3. Carry the featured flag over ────────────────────────────────────────
UPDATE profiles p
SET is_featured = true
FROM professionals pr
WHERE pr.profile_id = p.id AND pr.featured = true AND p.is_featured = false;

-- ── 4. Backfill the professionals who were never in the professionals table ─
-- 13 profiles are profile_type 'professional' with network_tab NULL, which is
-- why they never appeared on /network/professionals. They predate this work and
-- are unrelated to the dual-table bug; the tab value is unambiguous from type.
UPDATE profiles
SET network_tab = 'Professionals'
WHERE profile_type = 'professional' AND network_tab IS NULL;

-- ── 5. Give every professional profile a status ─────────────────────────────
UPDATE profiles
SET professional_status = 'approved'
WHERE profile_type = 'professional' AND professional_status IS NULL;
