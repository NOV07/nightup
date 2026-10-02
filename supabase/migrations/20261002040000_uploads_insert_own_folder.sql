-- Bucket "uploads": INSERT only into the caller's own folder.
--
-- The live INSERT policy "Authenticated users can upload" only checked that the
-- caller was authenticated, so a signed-in user could write an object under
-- another user's folder ({other-uid}/...). It now requires the first path
-- segment to be the caller's own auth.uid(), like the UPDATE / SELECT / DELETE
-- policies recorded in 20261002030000_record_manual_storage_and_follows_changes.sql.
--
-- Safe for the app: the only code that uploads to this bucket is
-- components/ui/ImageUpload.tsx, which always writes
-- {user.id}/{folder}/{timestamp}.{ext} with user.id from the verified session
-- (folders: avatars, banners, events, releases, spots). Every other upload goes
-- to a different bucket (events, gallery-media, article-images) through the
-- service role, which bypasses these policies.
--
-- This is the single definition of this policy; the earlier migration no longer
-- defines it.
--
-- Idempotent. To be run by hand in the Supabase SQL Editor.

drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
