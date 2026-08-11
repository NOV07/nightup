import { revalidatePath } from 'next/cache'

type Target = { path: string; type?: 'page' | 'layout' }

// Which cached public pages each table feeds. Pages served with
// `force-dynamic` re-read on every request and are deliberately absent here:
// / , /events, /events/all, /events/[id], /network, /search.
//
// A dynamic segment needs the 'page' type and clears every page matching that
// route, which is what we want — one row shows up on more than its own page
// (a deleted mix also has to drop out of "More Mixes" on every other mix).
const PUBLIC_PATHS: Record<string, Target[]> = {
  mixes: [
    { path: '/nightwaves' },
    { path: '/nightwaves/mixes' },
    { path: '/nightwaves/mix/[id]', type: 'page' },
    { path: '/nightwaves/artist/[id]', type: 'page' },
  ],
  music_releases: [
    { path: '/nightwaves' },
    { path: '/nightwaves/releases' },
    { path: '/nightwaves/release/[id]', type: 'page' },
    { path: '/nightwaves/artist/[id]', type: 'page' },
  ],
  playlists: [
    { path: '/nightwaves' },
    { path: '/nightwaves/playlists' },
    { path: '/nightwaves/playlist/[id]', type: 'page' },
  ],
  artists: [
    { path: '/nightwaves/artist/[id]', type: 'page' },
    { path: '/nightwaves/mix/[id]', type: 'page' },
  ],
  articles: [
    { path: '/magazine' },
    { path: '/magazine/[id]', type: 'page' },
    { path: '/magazine/series/[series]', type: 'page' },
  ],
  spots: [
    { path: '/spots' },
    { path: '/spots/[slug]', type: 'page' },
  ],
  profiles: [
    { path: '/about' },
    { path: '/network/artists' },
    { path: '/network/professionals' },
    { path: '/network/venues' },
    { path: '/nightwaves/release/[id]', type: 'page' },
    { path: '/spots/[slug]', type: 'page' },
  ],
  listings: [
    { path: '/network/listings' },
  ],
  // Every events listing is force-dynamic; /about is the one page that caches
  // them, for its counters.
  events: [
    { path: '/about' },
  ],
}

/**
 * Clears the ISR cache for the public pages that render `table`, so an admin
 * edit shows up on the live site immediately instead of after the page's
 * revalidate window.
 *
 * Never throws: a failed revalidation must not turn a successful write into an
 * error response, since the row has already changed by the time we get here.
 */
export function revalidatePublicPaths(table: string) {
  for (const { path, type } of PUBLIC_PATHS[table] ?? []) {
    try {
      revalidatePath(path, type)
    } catch (err) {
      console.error(`revalidatePath failed for ${path}:`, err)
    }
  }
}
