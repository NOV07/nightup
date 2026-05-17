const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  // Events
  const events = [
    { title: "Closing Party", image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80", genre: "Techno", price: "€12", date: "2026-05-09", time: "23:00", venue: "Six Dogs", city: "Athens", interested_count: 420, going_count: 180, featured_until: "2026-12-31T00:00:00Z", nightup_pick: true, status: "approved" },
    { title: "Underground Sessions", image_url: "https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=800&q=80", genre: "House", price: "€8", date: "2026-05-10", time: "22:00", venue: "Fuzz Club", city: "Athens", interested_count: 310, going_count: 140, featured_until: "2026-12-31T00:00:00Z", nightup_pick: false, status: "approved" },
    { title: "Techno Collective", image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80", genre: "Techno", price: "Free", date: "2026-05-10", time: "22:00", venue: "Venue 140", city: "Thessaloniki", interested_count: 280, going_count: 95, featured_until: null, nightup_pick: true, status: "approved" },
    { title: "Garage Night Vol.4", image_url: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80", genre: "Garage", price: "€10", date: "2026-05-10", time: "21:00", venue: "Bios", city: "Athens", interested_count: 190, going_count: 88, featured_until: null, nightup_pick: false, status: "approved" },
    { title: "Sunday Jazz", image_url: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80", genre: "Jazz", price: "Free", date: "2026-05-11", time: "20:00", venue: "Romantso", city: "Athens", interested_count: 150, going_count: 72, featured_until: null, nightup_pick: false, status: "approved" },
    { title: "Deep House Sundays", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80", genre: "House", price: "€6", date: "2026-05-11", time: "21:00", venue: "Bolivar", city: "Athens", interested_count: 200, going_count: 110, featured_until: null, nightup_pick: false, status: "approved" },
    { title: "Boiler Room Athens", image_url: "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=800&q=80", genre: "Electronic", price: "Free", date: "2026-05-15", time: "20:00", venue: "Technopolis", city: "Athens", interested_count: 890, going_count: 420, featured_until: "2026-12-31T00:00:00Z", nightup_pick: true, status: "approved" },
    { title: "R&B Night", image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80", genre: "R&B", price: "€15", date: "2026-05-16", time: "22:00", venue: "Venue 140", city: "Thessaloniki", interested_count: 175, going_count: 68, featured_until: null, nightup_pick: false, status: "approved" },
    { title: "Afro House Sessions", image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80", genre: "Afro House", price: "€12", date: "2026-05-18", time: "22:00", venue: "Gazarte", city: "Athens", interested_count: 310, going_count: 145, featured_until: "2026-12-31T00:00:00Z", nightup_pick: false, status: "approved" },
  ];

  const articles = [
    { title: "Από το Gazi στο Βερολίνο: η πορεία του Χουλιάρα", subtitle: "Μιλάμε με τον Αθηναίο DJ που έγινε resident στο Berghain", category: "Interview", hero_image: "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=800&q=80", excerpt: "Μιλάμε με τον Αθηναίο DJ που έγινε resident στο Berghain για το sound, την Ελλάδα και την underground σκηνή.", read_time: 8, status: "published", published_at: "2026-05-01", tags: ["DJ", "Berlin", "Interview"] },
    { title: "Τα καλύτερα festivals του καλοκαιριού 2026", subtitle: "Ο πλήρης οδηγός του καλοκαιριού", category: "Guide", hero_image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80", excerpt: "Από Sani Festival μέχρι Release Athens — ο πλήρης οδηγός του καλοκαιριού.", read_time: 5, status: "published", published_at: "2026-04-28", tags: ["Festival", "Summer", "Guide"] },
    { title: "Six Dogs: το μέρος που έκανε την Αθήνα underground", subtitle: "Η ιστορία ενός venue που άλλαξε τη νυχτερινή σκηνή", category: "Venue", hero_image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80", excerpt: "Η ιστορία ενός venue που άλλαξε τη νυχτερινή σκηνή.", read_time: 6, status: "published", published_at: "2026-04-20", tags: ["Venue", "Athens", "Underground"] },
    { title: "Η νέα γενιά των Ελλήνων DJs που κατακτά την Ευρώπη", subtitle: "Τέσσερις νέοι καλλιτέχνες από Αθήνα και Θεσσαλονίκη", category: "Feature", hero_image: "https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=800&q=80", excerpt: "Τέσσερις νέοι καλλιτέχνες από Αθήνα και Θεσσαλονίκη που παίζουν σε Βερολίνο, Λονδίνο και Άμστερνταμ.", read_time: 10, status: "published", published_at: "2026-04-15", tags: ["DJ", "Greece", "Europe"] },
    { title: "Πώς να οργανώσεις το τέλειο private party", subtitle: "Από την επιλογή venue μέχρι τον sound engineer", category: "Guide", hero_image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80", excerpt: "Από την επιλογή venue μέχρι τον sound engineer — όλα όσα χρειάζεσαι.", read_time: 7, status: "published", published_at: "2026-04-10", tags: ["Party", "Planning", "Guide"] },
  ];

  const professionals = [
    { name: "Vaggelis Chouliaras", image_url: "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=400&q=80", category: "DJ", rating: 4.9, reviews_count: 127, city: "Athens", description: "Berlin techno selector, Berghain resident.", featured: true, status: "approved" },
    { name: "Six Dogs", image_url: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80", category: "Venue", rating: 4.8, reviews_count: 312, city: "Athens", description: "Athens iconic underground venue.", featured: true, status: "approved" },
    { name: "Maria Papadaki", image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80", category: "DJ", rating: 4.6, reviews_count: 84, city: "Thessaloniki", description: "Deep house & minimal, Fabric resident.", featured: false, status: "approved" },
    { name: "Nikos Fotografos", image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80", category: "Photographer", rating: 4.7, reviews_count: 56, city: "Athens", description: "Nightlife & event photography specialist.", featured: true, status: "approved" },
    { name: "Sound Athens", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80", category: "Sound", rating: 4.5, reviews_count: 38, city: "Athens", description: "Professional sound equipment & engineers.", featured: false, status: "approved" },
    { name: "Fuzz Club", image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80", category: "Venue", rating: 4.7, reviews_count: 201, city: "Athens", description: "Athens legendary rock & alternative venue.", featured: true, status: "approved" },
    { name: "Kostas Lights", image_url: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=80", category: "Lighting", rating: 4.4, reviews_count: 22, city: "Athens", description: "Event & concert lighting designer.", featured: false, status: "approved" },
    { name: "Anna Promoter", image_url: "https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80", category: "Promoter", rating: 4.8, reviews_count: 97, city: "Thessaloniki", description: "Thessaloniki's top event organizer.", featured: true, status: "approved" },
  ];

  const releases = [
    { title: "I Hear You EP", artist: "Peggy Gou", type: "EP", cover_image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: true, status: "approved" },
    { title: "Antidawn", artist: "Burial", type: "EP", cover_image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: false, status: "approved" },
    { title: "Seeking Refuge", artist: "Forest Swords", type: "Single", cover_image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: true, status: "approved" },
    { title: "La Paloma", artist: "Khruangbin", type: "Album", cover_image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: false, status: "approved" },
    { title: "Fabric 100", artist: "Various Artists", type: "Mix", cover_image: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: false, status: "approved" },
    { title: "Late Night Tales", artist: "Jon Hopkins", type: "Mix", cover_image: "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: true, status: "approved" },
    { title: "Boiler Room Athens", artist: "Apashe", type: "Mix", cover_image: "https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: false, status: "approved" },
    { title: "Ostgut Ton Vol.15", artist: "Various Artists", type: "Album", cover_image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80", spotify_url: "https://open.spotify.com", is_promoted: false, status: "approved" },
  ];

  const mixes = [
    { title: "Boiler Room Athens 2026", artist: "Recondite", genre: "Techno", cover_image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80", status: "approved" },
    { title: "fabric 101", artist: "Call Super", genre: "House", cover_image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=80", status: "approved" },
    { title: "RA Exchange Mix", artist: "Shackleton", genre: "Techno", cover_image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80", status: "approved" },
    { title: "Rinse FM Guest Mix", artist: "Loraine James", genre: "Electronic", cover_image: "https://images.unsplash.com/photo-1574154894072-16736a4f4a3d?w=400&q=80", status: "approved" },
    { title: "RBMA Lecture Mix", artist: "Actress", genre: "Experimental", cover_image: "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=400&q=80", status: "approved" },
  ];

  const tables = [
    { name: "events", data: events },
    { name: "articles", data: articles },
    { name: "professionals", data: professionals },
    { name: "music_releases", data: releases },
    { name: "mixes", data: mixes },
  ];

  for (const { name, data } of tables) {
    const { error, count } = await supabase.from(name).insert(data, { count: "exact" });
    if (error) {
      console.error(`❌ ${name}: ${error.message}`);
    } else {
      console.log(`✅ ${name}: inserted ${data.length} rows`);
    }
  }
}

run().catch(console.error);
