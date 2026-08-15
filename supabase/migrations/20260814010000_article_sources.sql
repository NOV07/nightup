-- Article sources: the citation list that renders under the article body.
--
-- NOTE: like the other files in this folder, this is provided for manual review
-- and execution in the Supabase SQL Editor. Nothing here runs automatically.
--
-- Sources used to be `source`-type entries mixed into the retired `blocks`
-- array, which scattered them through the body wherever they were dropped.
-- They now live in their own column so the public page can render them as one
-- numbered list at the end.
--
-- Shape: [{ "title": "...", "url": "https://..." }]
-- Written and read by app/api/articles/route.ts and app/api/articles/[id]/route.ts,
-- both of which pass the value through sanitizeSources() first.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Guards against a non-array being written by anything that bypasses the API.
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_sources_is_array;
ALTER TABLE public.articles
  ADD CONSTRAINT articles_sources_is_array
  CHECK (jsonb_typeof(sources) = 'array');

-- The retired `blocks` column is deliberately left alone. It is empty on every
-- row (verified: 2 articles, both `[]`) and nothing reads it any more, but
-- dropping it is a separate, destructive decision.
