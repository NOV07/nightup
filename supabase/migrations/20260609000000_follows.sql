-- Follows table (artists, venues, professionals)
CREATE TABLE IF NOT EXISTS public.follows (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own follows"
  ON public.follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Follow counts are public"
  ON public.follows FOR SELECT
  USING (true);

CREATE INDEX idx_follows_user_id    ON public.follows(user_id);
CREATE INDEX idx_follows_profile_id ON public.follows(profile_id);
