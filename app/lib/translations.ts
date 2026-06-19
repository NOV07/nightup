export type Lang = "el" | "en";

const translations = {
  // ── Navigation ──────────────────────────────────────────────
  nav_home: { el: "Αρχική", en: "Home" },
  nav_events: { el: "Events", en: "Events" },
  nav_party: { el: "Make Your Party", en: "Make Your Party" },
  nav_radio: { el: "Radio", en: "Radio" },
  nav_articles: { el: "Articles", en: "Articles" },
  nav_about: { el: "About", en: "About" },

  // ── Homepage ──────────────────────────────────────────────
  home_tagline: { el: "find your night", en: "find your night" },
  home_hero_title: { el: "Your night starts here.", en: "Your night starts here." },
  home_hero_body: {
    el: "Βρες events και club nights σε όλη την Ελλάδα. Φτιάξε το δικό σου πάρτι από το μηδέν. Venues, DJs, ήχος, φώτα, catering. Όλα σε ένα μέρος.",
    en: "Find events and club nights across Greece. Build your own party from scratch. Venues, DJs, sound, lighting, catering. All in one place.",
  },
  home_live_radio: { el: "Live Radio", en: "Live Radio" },
  home_featured: { el: "Featured Tonight", en: "Featured Tonight" },
  home_view_all: { el: "Δες όλα →", en: "View all →" },
  home_latest_articles: { el: "Latest Articles", en: "Latest Articles" },
  home_new_releases: { el: "New Releases", en: "New Releases" },
  home_cta_title: { el: "Planning a Party?", en: "Planning a Party?" },
  home_cta_body: {
    el: "Βρες venues, DJs, φωτογράφους, και όλα τα άλλα για το τέλειο event σου.",
    en: "Find venues, DJs, photographers, and everything else for your perfect event.",
  },
  home_cta_button: { el: "Explore Professionals", en: "Explore Professionals" },

  // ── Events ──────────────────────────────────────────────
  events_title: { el: "Events", en: "Events" },
  events_section_hot:     { el: "Καυτά τώρα",              en: "Hot" },
  events_section_popular: { el: "Πιο Δημοφιλή",             en: "Most Popular" },
  events_section_tonight: { el: "Απόψε",                   en: "Tonight" },
  events_section_weekend: { el: "Αυτό το σαββατοκύριακο", en: "This Weekend" },
  events_section_near:    { el: "Κοντά σου",               en: "Near You" },
  events_hero_title: { el: "Κάθε βράδυ έχει τον ήχο του.", en: "Every night has its sound." },
  events_hero_body: {
    el: "Βρες την εκδήλωση που ταιριάζει στη βραδιά σου. Από techno μέχρι μπουζούκι.",
    en: "Find the event that fits your night. From techno to bouzouki.",
  },
  events_filter_all: { el: "Όλα", en: "All" },
  events_filter_genre: { el: "Είδος", en: "Genre" },
  events_filter_city: { el: "Πόλη", en: "City" },
  events_filter_date: { el: "Ημερομηνία:", en: "Date:" },
  events_popular: { el: "Δημοφιλή", en: "Popular" },
  events_featured: { el: "Featured", en: "Featured" },
  events_all_events: { el: "Όλα τα Events", en: "All Events" },
  events_no_results: { el: "Δεν βρέθηκαν events.", en: "No events found." },
  events_no_results_hint: { el: "Δοκίμασε άλλα φίλτρα.", en: "Try different filters." },
  events_search_placeholder: { el: "Αναζήτηση events, venues...", en: "Search events, venues..." },
  events_clear: { el: "Καθαρισμός", en: "Clear" },
  events_get_tickets: { el: "Get Tickets", en: "Get Tickets" },
  events_about: { el: "About", en: "About" },
  events_lineup: { el: "Lineup", en: "Lineup" },
  events_organizer: { el: "Organizer", en: "Organizer" },
  events_share: { el: "Share", en: "Share" },
  events_related: { el: "Related Events", en: "Related Events" },
  events_price_from: { el: "Τιμή από", en: "Price from" },
  events_interested: { el: "Ενδιαφέρομαι", en: "Interested" },
  events_going: { el: "Πάω", en: "Going" },

  // ── Party ──────────────────────────────────────────────
  party_hero_title: { el: "Make it happen.", en: "Make it happen." },
  party_hero_body: {
    el: "Όλοι οι επαγγελματίες που χρειάζεσαι για το πάρτι σου, σε ένα μέρος.",
    en: "All the professionals you need for your party, in one place.",
  },
  party_featured: { el: "Featured", en: "Featured" },
  party_view_profile: { el: "View Profile →", en: "View Profile →" },
  party_count: { el: "επαγγελματίες βρέθηκαν", en: "professionals found" },

  // ── Radio ──────────────────────────────────────────────
  radio_title: { el: "Radio", en: "Radio" },
  radio_hero_title: { el: "Live from Athens.", en: "Live from Athens." },
  radio_hero_body: { el: "House. Techno. R&B. Always on.", en: "House. Techno. R&B. Always on." },
  radio_now_playing: { el: "Παίζει τώρα", en: "Now Playing" },
  radio_tracklist: { el: "Tracklist", en: "Tracklist" },
  radio_stations: { el: "Όλοι οι Σταθμοί", en: "All Stations" },
  radio_live: { el: "ΖΩΝΤΑΝΑ", en: "LIVE NOW" },
  radio_paused: { el: "ΣΕ ΠΑΥΣΗ", en: "PAUSED" },
  radio_coming_soon: { el: "Σύντομα διαθέσιμο 🎸", en: "Coming soon 🎸" },
  radio_press_play: { el: "Πάτα play για να ξεκινήσεις", en: "Press play to start" },

  // ── Articles ──────────────────────────────────────────────
  articles_title: { el: "Articles", en: "Articles" },
  articles_read_more: { el: "Διάβασε →", en: "Read →" },
  articles_min_read: { el: "λεπτά ανάγνωση", en: "min read" },
  articles_all: { el: "Όλα", en: "All" },

  // ── About ──────────────────────────────────────────────
  about_title: { el: "About", en: "About" },
  about_tagline: { el: "find your night", en: "find your night" },
  about_hero_title: {
    el: "Ξεκίνησε από ένα Σάββατο βράδυ που δεν ξέραμε πού να πάμε. Τώρα κανείς δεν έχει αυτό το πρόβλημα.",
    en: "It started on a Saturday night when we didn't know where to go. Now nobody has that problem.",
  },
  about_hero_body: {
    el: "Το Nightup είναι η πρώτη ελληνική πλατφόρμα όπου βρίσκεις events και club nights σε όλη την Ελλάδα. Φιλτράρεις με βάση τη μουσική και την πόλη σου και πας κατευθείαν εκεί που θέλεις. Κι αν θέλεις να φτιάξεις το δικό σου πάρτι, έχουμε και αυτό: venues, DJs, ήχος, φώτα, catering. Όλοι οι επαγγελματίες που χρειάζεσαι, σε ένα μέρος.",
    en: "Nightup is the first Greek platform where you can find events and club nights all over Greece. Filter by music genre and your city and go straight to where you want to be. And if you want to throw your own party, we have that too: venues, DJs, sound, lighting, catering. All the professionals you need, in one place.",
  },
  about_stats_events: { el: "Events Listed", en: "Events Listed" },
  about_stats_professionals: { el: "Professionals", en: "Professionals" },
  about_stats_cities: { el: "Cities Covered", en: "Cities Covered" },
  about_stats_visitors: { el: "Monthly Visitors", en: "Monthly Visitors" },
  about_follow: { el: "Follow Us", en: "Follow Us" },
  about_contact: { el: "Επικοινωνία", en: "Contact Us" },
  about_contact_tab: { el: "Επικοινωνία", en: "Contact Us" },
  about_event_tab: { el: "Submit Event", en: "Submit Event" },
  about_profile_tab: { el: "Submit Profile", en: "Submit Profile" },
  about_send: { el: "Αποστολή Μηνύματος", en: "Send Message" },
  about_submit_event: { el: "Submit Event", en: "Submit Event" },
  about_submit_profile: { el: "Submit Profile", en: "Submit Profile" },
  about_get_in_touch: { el: "Επικοινωνήστε μαζί μας", en: "Get in Touch" },

  // ── Organizers ──────────────────────────────────────────────
  organizer_apply_title: { el: "Γίνε Διοργανωτής", en: "Become an Organizer" },
  organizer_apply_subtitle: {
    el: "Προωθήστε τα events σας σε χιλιάδες λάτρεις της νυχτερινής ζωής στην Ελλάδα.",
    en: "Promote your events to thousands of nightlife enthusiasts across Greece.",
  },
  organizer_upcoming: { el: "Επερχόμενα Events", en: "Upcoming Events" },
  organizer_gallery: { el: "Gallery", en: "Gallery" },

  // ── Footer ──────────────────────────────────────────────
  footer_discover: { el: "Ανακάλυψε", en: "Discover" },
  footer_party: { el: "Party", en: "Party" },
  footer_company: { el: "Εταιρεία", en: "Company" },
  footer_privacy: { el: "Πολιτική Απορρήτου", en: "Privacy Policy" },
  footer_terms: { el: "Όροι Χρήσης", en: "Terms of Service" },
  footer_copyright: { el: "© 2026 Nightup. Με επιφύλαξη παντός δικαιώματος.", en: "© 2026 Nightup. All rights reserved." },

  // ── Common ──────────────────────────────────────────────
  badge_free: { el: "Δωρεάν", en: "Free" },
  badge_featured: { el: "★ Featured", en: "★ Featured" },
  btn_back: { el: "Πίσω", en: "Back" },
  loading: { el: "Φόρτωση...", en: "Loading..." },
} as const;

export type TranslationKey = keyof typeof translations;

export function tr(key: TranslationKey, lang: Lang): string {
  return translations[key][lang];
}

export default translations;
