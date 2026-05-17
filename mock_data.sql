-- Mock data for Nightup platform
-- Run via: node run_mock_data.js

-- EVENTS (9 rows)
INSERT INTO events (title, image_url, genre, price, date, time, venue, city, interested_count, going_count, featured, nightup_pick, status)
VALUES
  ('Closing Party', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80', 'Techno', '€12', '2026-05-09', '23:00', 'Six Dogs', 'Athens', 420, 180, true, true, 'approved'),
  ('Underground Sessions', 'https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=800&q=80', 'House', '€8', '2026-05-10', '22:00', 'Fuzz Club', 'Athens', 310, 140, true, false, 'approved'),
  ('Techno Collective', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80', 'Techno', 'Free', '2026-05-10', '22:00', 'Venue 140', 'Thessaloniki', 280, 95, false, true, 'approved'),
  ('Garage Night Vol.4', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80', 'Garage', '€10', '2026-05-10', '21:00', 'Bios', 'Athens', 190, 88, false, false, 'approved'),
  ('Sunday Jazz', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80', 'Jazz', 'Free', '2026-05-11', '20:00', 'Romantso', 'Athens', 150, 72, false, false, 'approved'),
  ('Deep House Sundays', 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80', 'House', '€6', '2026-05-11', '21:00', 'Bolivar', 'Athens', 200, 110, false, false, 'approved'),
  ('Boiler Room Athens', 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=800&q=80', 'Electronic', 'Free', '2026-05-15', '20:00', 'Technopolis', 'Athens', 890, 420, true, true, 'approved'),
  ('R&B Night', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 'R&B', '€15', '2026-05-16', '22:00', 'Venue 140', 'Thessaloniki', 175, 68, false, false, 'approved'),
  ('Afro House Sessions', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80', 'Afro House', '€12', '2026-05-18', '22:00', 'Gazarte', 'Athens', 310, 145, true, false, 'approved');

-- ARTICLES (5 rows)
INSERT INTO articles (title, subtitle, category, hero_image, excerpt, read_time, status, published_at, tags)
VALUES
  ('Από το Gazi στο Βερολίνο: η πορεία του Χουλιάρα', 'Μιλάμε με τον Αθηναίο DJ που έγινε resident στο Berghain', 'Interview', 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=800&q=80', 'Μιλάμε με τον Αθηναίο DJ που έγινε resident στο Berghain για το sound, την Ελλάδα και την underground σκηνή.', 8, 'published', '2026-05-01', ARRAY['DJ', 'Berlin', 'Interview']),
  ('Τα καλύτερα festivals του καλοκαιριού 2026', 'Ο πλήρης οδηγός του καλοκαιριού', 'Guide', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 'Από Sani Festival μέχρι Release Athens — ο πλήρης οδηγός του καλοκαιριού.', 5, 'published', '2026-04-28', ARRAY['Festival', 'Summer', 'Guide']),
  ('Six Dogs: το μέρος που έκανε την Αθήνα underground', 'Η ιστορία ενός venue που άλλαξε τη νυχτερινή σκηνή', 'Venue', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80', 'Η ιστορία ενός venue που άλλαξε τη νυχτερινή σκηνή.', 6, 'published', '2026-04-20', ARRAY['Venue', 'Athens', 'Underground']),
  ('Η νέα γενιά των Ελλήνων DJs που κατακτά την Ευρώπη', 'Τέσσερις νέοι καλλιτέχνες από Αθήνα και Θεσσαλονίκη', 'Feature', 'https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=800&q=80', 'Τέσσερις νέοι καλλιτέχνες από Αθήνα και Θεσσαλονίκη που παίζουν σε Βερολίνο, Λονδίνο και Άμστερνταμ.', 10, 'published', '2026-04-15', ARRAY['DJ', 'Greece', 'Europe']),
  ('Πώς να οργανώσεις το τέλειο private party', 'Από την επιλογή venue μέχρι τον sound engineer', 'Guide', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80', 'Από την επιλογή venue μέχρι τον sound engineer — όλα όσα χρειάζεσαι.', 7, 'published', '2026-04-10', ARRAY['Party', 'Planning', 'Guide']);

-- PROFESSIONALS (8 rows)
INSERT INTO professionals (name, image_url, category, rating, reviews_count, city, description, featured, status)
VALUES
  ('Vaggelis Chouliaras', 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=400&q=80', 'DJ', 4.9, 127, 'Athens', 'Berlin techno selector, Berghain resident.', true, 'approved'),
  ('Six Dogs', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80', 'Venue', 4.8, 312, 'Athens', 'Athens iconic underground venue.', true, 'approved'),
  ('Maria Papadaki', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80', 'DJ', 4.6, 84, 'Thessaloniki', 'Deep house & minimal, Fabric resident.', false, 'approved'),
  ('Nikos Fotografos', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80', 'Photographer', 4.7, 56, 'Athens', 'Nightlife & event photography specialist.', true, 'approved'),
  ('Sound Athens', 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80', 'Sound', 4.5, 38, 'Athens', 'Professional sound equipment & engineers.', false, 'approved'),
  ('Fuzz Club', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', 'Venue', 4.7, 201, 'Athens', 'Athens legendary rock & alternative venue.', true, 'approved'),
  ('Kostas Lights', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=80', 'Lighting', 4.4, 22, 'Athens', 'Event & concert lighting designer.', false, 'approved'),
  ('Anna Promoter', 'https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80', 'Promoter', 4.8, 97, 'Thessaloniki', 'Thessaloniki''s top event organizer.', true, 'approved');

-- MUSIC RELEASES (8 rows)
INSERT INTO music_releases (title, artist, type, cover_image, spotify_url, is_promoted, status)
VALUES
  ('I Hear You EP', 'Peggy Gou', 'EP', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', 'https://open.spotify.com', true, 'approved'),
  ('Antidawn', 'Burial', 'EP', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80', 'https://open.spotify.com', false, 'approved'),
  ('Seeking Refuge', 'Forest Swords', 'Single', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80', 'https://open.spotify.com', true, 'approved'),
  ('La Paloma', 'Khruangbin', 'Album', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80', 'https://open.spotify.com', false, 'approved'),
  ('Fabric 100', 'Various Artists', 'Mix', 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80', 'https://open.spotify.com', false, 'approved'),
  ('Late Night Tales', 'Jon Hopkins', 'Mix', 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=400&q=80', 'https://open.spotify.com', true, 'approved'),
  ('Boiler Room Athens', 'Apashe', 'Mix', 'https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80', 'https://open.spotify.com', false, 'approved'),
  ('Ostgut Ton Vol.15', 'Various Artists', 'Album', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80', 'https://open.spotify.com', false, 'approved');

-- MIXES (5 rows)
INSERT INTO mixes (title, artist, genre, cover_image, status)
VALUES
  ('Boiler Room Athens 2026', 'Recondite', 'Techno', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', 'approved'),
  ('fabric 101', 'Call Super', 'House', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=80', 'approved'),
  ('RA Exchange Mix', 'Shackleton', 'Techno', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80', 'approved'),
  ('Rinse FM Guest Mix', 'Loraine James', 'Electronic', 'https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80', 'approved'),
  ('RBMA Lecture Mix', 'Actress', 'Experimental', 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=400&q=80', 'approved');
