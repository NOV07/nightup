'use client'
import Link from 'next/link'
import FollowButton from '@/components/ui/FollowButton'
import CroppedImage from '@/components/ui/CroppedImage'
import { getAvatarCrop } from '@/app/lib/profileCrop'
import { useLanguage } from '@/app/components/LanguageContext'
import type { Profile } from '@/app/lib/networkProfile'

const GOLD = '#E8A020'
const SURFACE = '#111120'
const BORDER = 'rgba(232,160,32,0.12)'

// Full profile card — the grid card used across the network category routes.
// `accent` lets a whole section carry its own colour (the Professionals page
// runs "For Artists" in blue); everything else defaults to gold.
export default function ProfileCard({ profile, accent = GOLD }: { profile: Profile; accent?: string }) {
  const { t } = useLanguage()
  const initials = profile.display_name?.slice(0, 2).toUpperCase() || '?'
  const accentSoft = accent === GOLD ? 'rgba(232,160,32,0.12)' : 'rgba(96,165,250,0.12)'
  const accentBorder = accent === GOLD ? BORDER : 'rgba(96,165,250,0.12)'
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex flex-col gap-3 p-4 transition-all hover:opacity-90"
      style={{
        backgroundColor: SURFACE,
        border: `1px solid ${profile.is_featured ? accent : accentBorder}`,
        borderRadius: 6,
      }}
    >
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <div className="relative rounded-full flex-shrink-0" style={{ width: 48, height: 48, overflow: 'hidden', border: `1px solid ${accentBorder}` }}>
            <CroppedImage
              src={profile.avatar_url}
              alt={profile.display_name}
              crop={getAvatarCrop(profile)}
              sizes="48px"
            />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: accentSoft, color: accent }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-white text-sm truncate">{profile.display_name}</p>
            {profile.is_verified && <span style={{ color: accent }} className="text-xs">✓</span>}
            {profile.is_featured && <span style={{ color: accent }} className="text-xs">★</span>}
          </div>
          {/* Professionals have no second taxonomy level — network_subcategory is
              empty for all of them — so fall back to the category, which is the
              role the card is meant to show. */}
          {(profile.network_subcategory || profile.network_category) && (
            <p className="text-xs mt-0.5" style={{ color: accent }}>
              {profile.network_subcategory || profile.network_category}
            </p>
          )}
          <div className="mt-2">
            <FollowButton profileId={profile.id} />
          </div>
        </div>
      </div>
      {profile.location && (
        <p className="text-xs text-white/40">📍 {profile.location}</p>
      )}
      {profile.bio && (
        <p className="text-xs text-white/50 line-clamp-2">{profile.bio}</p>
      )}
      <p className="text-xs font-medium mt-auto" style={{ color: accent }}>{t("network_view_profile")}</p>
    </Link>
  )
}
