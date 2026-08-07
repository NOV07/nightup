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

  const [events, professionals, articles, organizers, releases, mixes, playlists, artists, profiles, upgradeRequests, spots, featuredRequests, spotClaims] = await Promise.all([
    // select('*') so the unified admin event form edits a complete row —
    // anything it does not receive would be written back empty on save.
    admin.from('events').select('*').order('created_at', { ascending: false }),
    admin.from('professionals').select('id, name, category, city, description, instagram, facebook, tiktok, website, phone, featured, status, created_at').order('created_at', { ascending: false }),
    admin.from('articles').select('id, title, category, published_at, excerpt, content, hero_image, read_time, series, series_order, slug, word_count, updated_at, tags, status, created_at').order('created_at', { ascending: false }),
    admin.from('organizers').select('id, name, type, city, about, cover_image, avatar, instagram, facebook, tiktok, website, gallery, status, created_at').order('created_at', { ascending: false }),
    admin.from('music_releases').select('id, title, artist, type, genre, cover_image, spotify_url, soundcloud_url, description, is_promoted, status, created_at').order('created_at', { ascending: false }),
    admin.from('mixes').select('id, title, artist, genre, cover_image, soundcloud_url, duration, status, created_at').order('created_at', { ascending: false }),
    admin.from('playlists').select('id, title, platform, embed_url, cover_image, is_sponsored, status, created_at').order('created_at', { ascending: false }),
    admin.from('artists').select('id, name, origin, about, photo, genres, style_tags, spotify_url, soundcloud_url, instagram, website, status, created_at').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, username, display_name, profile_type, avatar_url, is_verified, is_featured, plan_tier, created_at').order('created_at', { ascending: false }),
    admin.from('upgrade_requests').select('id, user_id, username, email, specialty, requested_type, bio, status, created_at').order('created_at', { ascending: false }),
    admin.from('spots').select('*').order('created_at', { ascending: false }),
    admin.from('featured_event_requests').select('id, event_id, profile_id, status, created_at, events(title, date, venue)').order('created_at', { ascending: false }),
    admin.from('spot_claims').select('id, spot_id, profile_id, note, status, created_at, spots(name, slug, city)').order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    events: events.data ?? [],
    professionals: professionals.data ?? [],
    articles: articles.data ?? [],
    organizers: organizers.data ?? [],
    releases: releases.data ?? [],
    mixes: mixes.data ?? [],
    playlists: playlists.data ?? [],
    artists: artists.data ?? [],
    profiles: profiles.data ?? [],
    upgrade_requests: upgradeRequests.data ?? [],
    spots: spots.data ?? [],
    featured_requests: featuredRequests.data ?? [],
    spot_claims: spotClaims.data ?? [],
  })
}
