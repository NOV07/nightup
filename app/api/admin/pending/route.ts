import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  const [events, articles, releases, mixes, playlists, artists, profiles, upgradeRequests, spots, featuredRequests, spotClaims, listings] = await Promise.all([
    // select('*') so the unified admin event form edits a complete row —
    // anything it does not receive would be written back empty on save.
    admin.from('events').select('*').order('created_at', { ascending: false }),
    admin.from('articles').select('id, title, category, published_at, excerpt, content, hero_image, read_time, series, series_order, slug, word_count, updated_at, tags, status, created_at').order('created_at', { ascending: false }),
    // primary_genre, not genre — the genre column was dropped in the release
    // refactor and selecting it 400s the whole query.
    admin.from('music_releases').select('id, title, artist, type, primary_genre, cover_image, spotify_url, soundcloud_url, description, is_promoted, status, created_at').order('created_at', { ascending: false }),
    admin.from('mixes').select('id, title, artist, genre, cover_image, soundcloud_url, duration, status, created_at').order('created_at', { ascending: false }),
    admin.from('playlists').select('id, title, platform, embed_url, cover_image, is_sponsored, status, created_at').order('created_at', { ascending: false }),
    admin.from('artists').select('id, name, origin, about, photo, genres, style_tags, spotify_url, soundcloud_url, instagram, website, status, created_at').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, username, display_name, profile_type, avatar_url, is_verified, is_featured, plan_tier, network_tab, network_category, network_subcategory, professional_status, genres, venue_capacity, venue_address, venue_neighborhood, location, created_at').order('created_at', { ascending: false }),
    admin.from('upgrade_requests').select('id, user_id, username, email, specialty, requested_type, bio, status, created_at').order('created_at', { ascending: false }),
    admin.from('spots').select('*').order('created_at', { ascending: false }),
    admin.from('featured_event_requests').select('id, event_id, profile_id, status, created_at, events(title, date, venue)').order('created_at', { ascending: false }),
    admin.from('spot_claims').select('id, spot_id, profile_id, note, status, created_at, spots(name, slug, city)').order('created_at', { ascending: false }),
    // No is_active filter: the public board only serves active rows, so the
    // panel is the only place an operator can see or revive a disabled one.
    admin.from('listings').select('*, profiles(display_name, username, avatar_url)').order('created_at', { ascending: false }),
  ])

  // A failed query returns data: null, which `?? []` renders as an empty tab —
  // indistinguishable from a table that really has no rows. That is how the
  // dropped music_releases.genre column stayed hidden. Report the failures so
  // the panel can say "this broke" instead of silently showing nothing.
  const errors = Object.entries({
    events, articles, releases, mixes, playlists, artists,
    profiles, upgrade_requests: upgradeRequests, spots,
    featured_requests: featuredRequests, spot_claims: spotClaims, listings,
  }).reduce<Record<string, string>>((acc, [key, res]) => {
    if (res.error) acc[key] = res.error.message
    return acc
  }, {})

  for (const [key, message] of Object.entries(errors)) {
    console.error(`[admin/pending] ${key} query failed: ${message}`)
  }

  return NextResponse.json({
    events: events.data ?? [],
    articles: articles.data ?? [],
    releases: releases.data ?? [],
    mixes: mixes.data ?? [],
    playlists: playlists.data ?? [],
    artists: artists.data ?? [],
    profiles: profiles.data ?? [],
    upgrade_requests: upgradeRequests.data ?? [],
    // spots gates on is_published, not status. The admin queue keys off status
    // everywhere, so surface a derived one rather than special-casing the UI —
    // without it no unpublished spot ever appears in the pending queue.
    spots: (spots.data ?? []).map(s => ({ ...s, status: s.is_published ? 'approved' : 'pending' })),
    featured_requests: featuredRequests.data ?? [],
    spot_claims: spotClaims.data ?? [],
    listings: listings.data ?? [],
    errors,
  })
}
