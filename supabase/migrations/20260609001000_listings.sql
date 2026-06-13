CREATE TABLE IF NOT EXISTS public.listings (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('seeking', 'offering')),
  role         TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  city         TEXT,
  date_needed  DATE,
  is_active    BOOLEAN DEFAULT true,
  is_sponsored BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active listings
CREATE POLICY "Active listings are public"
  ON public.listings FOR SELECT
  USING (is_active = true);

-- Owners can manage their own listings
CREATE POLICY "Owners can manage listings"
  ON public.listings FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Interests table (who expressed interest in a listing)
CREATE TABLE IF NOT EXISTS public.listing_interests (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, profile_id)
);

ALTER TABLE public.listing_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interests visible to listing owner and sender"
  ON public.listing_interests FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id)
    OR
    auth.uid() = (SELECT p.user_id FROM public.profiles p
                  JOIN public.listings l ON l.profile_id = p.id
                  WHERE l.id = listing_id)
  );

CREATE POLICY "Users can manage their own interests"
  ON public.listing_interests FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE INDEX idx_listings_profile_id ON public.listings(profile_id);
CREATE INDEX idx_listings_city ON public.listings(city);
CREATE INDEX idx_listings_role ON public.listings(role);
CREATE INDEX idx_listing_interests_listing_id ON public.listing_interests(listing_id);
CREATE INDEX idx_listing_interests_profile_id ON public.listing_interests(profile_id);
