-- Self-service spot creation: link a spot to the account that owns it.
--
-- Checked against the live schema before writing this: phone, website, gallery
-- and opening_hours ALL already exist, so only owner_id is actually missing.
-- Note gallery is jsonb, not text[] — writers must send a JSON array.
--
-- There is no `status` column on spots. `is_published` is the real gate: every
-- public read filters on it (app/spots/data.ts, app/spots/[slug]/page.tsx,
-- app/search/page.tsx, components/SearchBar.tsx, app/sitemap.ts,
-- app/components/LayoutShell.tsx) and 43 of 107 live rows sit unpublished.
-- Self-created spots therefore start is_published = false.

ALTER TABLE spots ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS spots_owner_id_idx ON spots (owner_id);

-- RLS. The API routes use the caller's session (app/lib/supabase-server), not
-- the service role, so inserts and updates go through these policies.
--
-- Two ownership columns coexist: owner_id for spots created through the new
-- wizard, claimed_by_profile_id for the older claim flow. An owner should be
-- able to act on their spot through either, so the update policy covers both
-- rather than adding a second, near-identical policy.
--
-- profiles.id is the auth user id, so auth.uid() compares directly.

ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can update their claimed spot" ON spots;
DROP POLICY IF EXISTS "Owners can update their spot" ON spots;
CREATE POLICY "Owners can update their spot" ON spots
  FOR UPDATE TO authenticated
  USING      (owner_id = auth.uid() OR claimed_by_profile_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR claimed_by_profile_id = auth.uid());

DROP POLICY IF EXISTS "Spot accounts can create their spot" ON spots;
CREATE POLICY "Spot accounts can create their spot" ON spots
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Without this an owner cannot see their own spot until an admin publishes it,
-- which would break both the dashboard card and the edit form.
DROP POLICY IF EXISTS "Owners can read their own spot" ON spots;
CREATE POLICY "Owners can read their own spot" ON spots
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR claimed_by_profile_id = auth.uid());
