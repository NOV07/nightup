-- Records three changes that were made by hand in the Supabase SQL Editor on the
-- live project, so a new environment ends up in the same state.
--
-- This migration only DESCRIBES what is already live: every statement is
-- idempotent (drop ... if exists + create, on conflict ...) and re-running it on
-- the live database changes nothing.
--
-- ── 1. Storage: bucket "uploads" ────────────────────────────────────────────
-- components/ui/ImageUpload.tsx uploads from the browser with the signed-in
-- user's session to {auth.uid()}/{folder}/{timestamp}.{ext} and passes
-- `upsert: true`. Supabase Storage needs INSERT *and* UPDATE (to replace an
-- existing object) *and* SELECT (to find it) policies for an upsert. Without the
-- UPDATE and SELECT policies below, the Spot form's cover upload (step 3,
-- "Φωτογραφίες & Ώρες") failed with
--   "new row violates row-level security policy".
-- The same ImageUpload serves the Professional, Venue, Artist, release, event
-- and dashboard avatar/banner uploads.
--
-- Note: the INSERT policy only requires an authenticated caller; it does not
-- pin the object to the caller's own folder (unlike the other three). It is
-- recorded as it is live.
-- The bucket row itself is not created here: it already exists (public) and no
-- earlier migration creates it.

drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
  on storage.objects for insert to public
  with check (bucket_id = 'uploads' and auth.role() = 'authenticated');

drop policy if exists "Users can delete own uploads" on storage.objects;
create policy "Users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);

-- Needed by `upsert: true` in ImageUpload.tsx.
drop policy if exists "Users can update own uploads" on storage.objects;
create policy "Users can update own uploads"
  on storage.objects for update to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- Needed by `upsert: true` in ImageUpload.tsx.
drop policy if exists "Users can select own uploads" on storage.objects;
create policy "Users can select own uploads"
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 2. Storage: bucket "gallery-media" ──────────────────────────────────────
-- Public bucket used by app/api/gallery/upload/route.ts (service role). It was
-- missing on the live project (20260814000000_gallery_media_type.sql inserts it
-- with `on conflict do nothing`, and that insert may be rejected depending on
-- project permissions, see the note there), so it was created by hand. Its
-- public read policy is in that earlier migration.
insert into storage.buckets (id, name, public)
values ('gallery-media', 'gallery-media', true)
on conflict (id) do update set public = true;

-- ── 3. follows: private ─────────────────────────────────────────────────────
-- 20260609000000_follows.sql created "Follow counts are public" with
-- USING (true), which let anyone read every user_id -> profile_id pair. It was
-- dropped by hand. Only "Users can manage their own follows"
-- (FOR ALL, auth.uid() = user_id) remains. Aggregate numbers are served by the
-- count-only functions in 20261002000000_private_follows_and_owner_counts.sql.
drop policy if exists "Follow counts are public" on public.follows;
