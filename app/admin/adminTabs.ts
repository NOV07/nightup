// Tab identifiers shared by the admin panel and the admin shell chrome
// (sidebar / mobile nav). They live here rather than in AdminClient so the
// sidebar can render every nav entry without importing the whole panel.

// The profile tabs are prefixed rather than named "artists"/"venues" directly:
// getTableForTab derives the table name from the tab id, and a bare "artists"
// tab would resolve to the music artists table and delete the wrong row.
export type ProfileTab = "profiles-artists" | "profiles-professionals" | "profiles-venues" | "profiles-organizers";
export type Tab = "events" | "articles" | "music" | "users" | "upgrades" | "featured" | "queue" | "spots" | "spot-claims" | ProfileTab;

/** The four profile tabs are the same list filtered by profile_type; only the
 *  label and the secondary line differ. */
export const PROFILE_TABS: Record<ProfileTab, {
  profileType: string;
  label: string;
  empty: string;
  secondary: (p: Record<string, any>) => string;
}> = {
  "profiles-artists": {
    profileType: "artist", label: "Artists", empty: "No artists yet.",
    secondary: p => [Array.isArray(p.genres) ? p.genres.join(", ") : p.genres, p.location].filter(Boolean).join(" · "),
  },
  "profiles-professionals": {
    profileType: "professional", label: "Professionals", empty: "No professionals yet.",
    secondary: p => [p.network_category, p.network_subcategory, p.location].filter(Boolean).join(" · "),
  },
  "profiles-venues": {
    profileType: "venue", label: "Venues", empty: "No venues yet.",
    secondary: p => [
      p.venue_capacity ? `cap. ${p.venue_capacity}` : null,
      [p.venue_address, p.venue_neighborhood].filter(Boolean).join(", ") || null,
    ].filter(Boolean).join(" · "),
  },
  "profiles-organizers": {
    profileType: "organizer", label: "Organizers", empty: "No organizers yet.",
    secondary: p => [p.network_category, p.location].filter(Boolean).join(" · "),
  },
};

export const PROFILE_TAB_IDS = Object.keys(PROFILE_TABS) as ProfileTab[];

const TAB_IDS: Tab[] = [
  "queue", "upgrades", "featured", "spot-claims", "users",
  "events", "music", "spots", "articles",
  ...PROFILE_TAB_IDS,
];

/** Guards the `?tab=` query param the sidebar uses to hand a tab to /admin
 *  from another admin route. */
export function isTab(value: string | null | undefined): value is Tab {
  return !!value && (TAB_IDS as string[]).includes(value);
}
