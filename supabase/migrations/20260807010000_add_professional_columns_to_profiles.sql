-- Part A of unifying the `professionals` table into `profiles`.
--
-- profile_type 'professional' used to write to two tables at once. These are the
-- only columns `professionals` held that had no home on `profiles`; everything
-- else maps onto existing columns (see the migration in the next file):
--   professionals.email        -> profiles.booking_email
--   professionals.availability -> profiles.is_available  ('available' = true)
--   professionals.image_url    -> profiles.avatar_url
--   professionals.gallery      -> creator_gallery rows
--   professionals.category     -> profiles.network_category
--   professionals.featured     -> profiles.is_featured
--
-- Named `professional_status`, not `status`: verified there is no `status`
-- column on profiles today, but the generic name invites a future collision.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_status text DEFAULT 'approved';
