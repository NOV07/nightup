-- Gallery: array of image URLs, mirrors the pattern used for creator_gallery
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery text[] DEFAULT '{}';

-- Age restriction: replace boolean with enum-like text column.
-- NOT using ALTER TYPE — adding a new column instead, per project convention
-- (never run ALTER TYPE + INSERT using new value in same transaction).
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_restriction_level text DEFAULT 'none';
-- Allowed values enforced at application level: 'none' | '18+' | '21+'

-- Backfill from the old boolean column: true -> '18+', false/null -> 'none'
-- DEPRECATED, safe to drop after Aug 2026 verification
UPDATE events SET age_restriction_level = '18+' WHERE age_restriction = true;
UPDATE events SET age_restriction_level = 'none' WHERE age_restriction IS NOT TRUE;
