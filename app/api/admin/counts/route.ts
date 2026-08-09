import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'

// Badge numbers only. /api/admin/pending returns every row of every table so
// the panel can render it; routes that just need the sidebar badges (magazine)
// would be paying for that whole payload to show three integers.

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  // Matches AdminClient: the day boundary is the UTC date, same as slicing an
  // ISO created_at to its first ten characters.
  const todayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`

  /** Row count without the rows. */
  const count = (
    table: string,
    apply: (q: any) => any = q => q,
  ): Promise<number> =>
    Promise.resolve(apply(admin.from(table).select('id', { count: 'exact', head: true })))
      .then((res: any) => {
        if (res.error) {
          console.error(`[admin/counts] ${table} count failed: ${res.error.message}`)
          return 0
        }
        return res.count ?? 0
      })

  const pending = (table: string) => count(table, q => q.eq('status', 'pending'))
  const approvedToday = (table: string) =>
    count(table, q => q.eq('status', 'approved').gte('created_at', todayStart))

  const [
    pendingEvents, pendingArticles, pendingReleases, pendingMixes,
    pendingPlaylists, pendingArtists, pendingSpots,
    pendingUpgrades, pendingFeatured, pendingSpotClaims,
    todayEvents, todayArticles, todayReleases, todayMixes,
    todayPlaylists, todayArtists, todaySpots,
  ] = await Promise.all([
    pending('events'),
    pending('articles'),
    pending('music_releases'),
    pending('mixes'),
    pending('playlists'),
    pending('artists'),
    // spots gate on is_published rather than a status column, exactly as
    // /api/admin/pending derives it before handing rows to the panel.
    count('spots', q => q.eq('is_published', false)),
    pending('upgrade_requests'),
    pending('featured_event_requests'),
    pending('spot_claims'),
    approvedToday('events'),
    approvedToday('articles'),
    approvedToday('music_releases'),
    approvedToday('mixes'),
    approvedToday('playlists'),
    approvedToday('artists'),
    count('spots', q => q.eq('is_published', true).gte('created_at', todayStart)),
  ])

  const totalPending =
    pendingEvents + pendingArticles + pendingReleases + pendingMixes +
    pendingPlaylists + pendingArtists + pendingSpots

  const publishedToday =
    todayEvents + todayArticles + todayReleases + todayMixes +
    todayPlaylists + todayArtists + todaySpots

  return NextResponse.json({
    totalPending,
    pendingUpgrades,
    publishedToday,
    byTab: {
      queue: totalPending,
      events: pendingEvents,
      music: pendingReleases + pendingArtists,
      spots: pendingSpots,
      articles: pendingArticles,
      upgrades: pendingUpgrades,
      featured: pendingFeatured,
      'spot-claims': pendingSpotClaims,
      users: 0,
    },
  })
}
