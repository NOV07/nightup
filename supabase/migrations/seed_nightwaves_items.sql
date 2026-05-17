-- Seed featured home page Nightwaves cards
-- Run in Supabase SQL Editor after creating the nightwaves_items table

INSERT INTO nightwaves_items (title, artist, subtitle, cover_url, type, source, source_url, featured_on_home, order_index)
VALUES
  (
    'Boiler Room x Dekmantel',
    'Peggy Gou',
    'DJ Set',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
    'mix',
    'soundcloud',
    'https://soundcloud.com/platform/peggy-gou',
    true,
    1
  ),
  (
    'Streaming From Isolation',
    'Peggy Gou',
    'Boiler Room',
    'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80',
    'mix',
    'soundcloud',
    'https://soundcloud.com/platform/peggy-gou-isolation',
    true,
    2
  ),
  (
    'Troop',
    'Peggy Gou',
    'Boiler Room Debuts',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    'single',
    'soundcloud',
    'https://soundcloud.com/platform/peggy-gou-troop',
    true,
    3
  ),
  (
    'Production Mix',
    'GiGi FM',
    'NTS Radio',
    'https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80',
    'mix',
    'soundcloud',
    'https://soundcloud.com/gigi-fm/nts-radio-gigi-fm-production-mix-21052025',
    true,
    4
  );
