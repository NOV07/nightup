import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  const [events, professionals, articles, organizers, releases, mixes, playlists, artists, profiles, upgradeRequests] = await Promise.all([
    admin.from('events').select('id, title, venue, city, date, time, genre, price, description, lineup, contact_email, instagram, facebook, tiktok, website, image_url, nightup_pick, is_radar_pick, organizer_id, profile_id, status, created_at').order('created_at', { ascending: false }),
    admin.from('professionals').select('id, name, category, city, description, instagram, facebook, tiktok, website, phone, featured, status, created_at').order('created_at', { ascending: false }),
    admin.from('articles').select('id, title, category, published_at, excerpt, content, hero_image, read_time, series, series_order, slug, word_count, updated_at, tags, status, created_at').order('created_at', { ascending: false }),
    admin.from('organizers').select('id, name, type, city, about, cover_image, avatar, instagram, facebook, tiktok, website, gallery, status, created_at').order('created_at', { ascending: false }),
    admin.from('music_releases').select('id, title, artist, type, genre, cover_image, spotify_url, soundcloud_url, description, is_promoted, status, created_at').order('created_at', { ascending: false }),
    admin.from('mixes').select('id, title, artist, genre, cover_image, soundcloud_url, duration, status, created_at').order('created_at', { ascending: false }),
    admin.from('playlists').select('id, title, platform, embed_url, cover_image, is_sponsored, status, created_at').order('created_at', { ascending: false }),
    admin.from('artists').select('id, name, origin, about, photo, genres, style_tags, spotify_url, soundcloud_url, instagram, website, status, created_at').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, username, display_name, profile_type, avatar_url, is_verified, is_featured, plan_tier, created_at').order('created_at', { ascending: false }),
    admin.from('upgrade_requests').select('id, user_id, username, email, specialty, bio, status, created_at').order('created_at', { ascending: false }),
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
  })
}
