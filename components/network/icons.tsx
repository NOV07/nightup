// Hand-drawn glyphs for the four network gates. Each one carries its own accent
// so the categories read apart at a glance — the gold is Artists only. Drawn on
// a 40×40 grid, stroke-based, so they stay crisp at the 22px the gates use.

export interface GlyphProps {
  size?: number
  className?: string
}

const GOLD = '#E8A020'
const GOLD_LIGHT = '#F5B335'
const PURPLE = '#9B7EDE'
const PURPLE_LIGHT = '#C4AEEF'
const BLUE = '#60A5FA'
const BLUE_LIGHT = '#93C5FD'
const GREEN = '#34D399'
const GREEN_LIGHT = '#6EE7B7'

const svgProps = {
  viewBox: '0 0 40 40',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

// The party-builder set is drawn on a tighter 32×32 grid; stroke stays at 1.4 so
// the two grids still read as one weight when they sit in the same list.
const svgProps32 = { ...svgProps, viewBox: '0 0 32 32' }

/** Vinyl record with the tonearm resting on it. */
export function ArtistsIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps}>
      <circle cx="18" cy="20" r="13" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="18" cy="20" r="8.5" stroke={GOLD} strokeWidth="1.4" opacity="0.5" />
      <circle cx="18" cy="20" r="2.2" fill={GOLD_LIGHT} />
      {/* tonearm: pivot top-right, headshell down on the groove */}
      <circle cx="33.5" cy="8" r="1.5" fill={GOLD_LIGHT} />
      <path d="M33.5 8 L29.5 12.5 L24.2 16.8" stroke={GOLD_LIGHT} strokeWidth="1.4" />
      <circle cx="23.6" cy="17.3" r="1.7" stroke={GOLD_LIGHT} strokeWidth="1.4" />
    </svg>
  )
}

/** Spotlight beam spilling onto a stage line. */
export function VenuesIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps}>
      <circle cx="20" cy="7" r="2.2" fill={PURPLE_LIGHT} />
      <path d="M17 10.5 L8 28.5 L32 28.5 L23 10.5 Z" stroke={PURPLE} strokeWidth="1.4" />
      <path d="M20 13 L20 28.5" stroke={PURPLE_LIGHT} strokeWidth="1.2" opacity="0.45" />
      <path d="M6 32.5 H34" stroke={PURPLE} strokeWidth="1.6" />
    </svg>
  )
}

/** Gear with a waveform running out of its right-hand side. */
export function ProfessionalsIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps}>
      <circle cx="13" cy="20" r="6.5" stroke={BLUE} strokeWidth="1.4" />
      <circle cx="13" cy="20" r="2.4" stroke={BLUE} strokeWidth="1.4" opacity="0.5" />
      {/* eight teeth at 45° intervals */}
      <g stroke={BLUE} strokeWidth="1.4">
        <path d="M20.5 20 H22.8" />
        <path d="M18.3 25.3 L19.9 26.9" />
        <path d="M13 27.5 V29.8" />
        <path d="M7.7 25.3 L6.1 26.9" />
        <path d="M5.5 20 H3.2" />
        <path d="M7.7 14.7 L6.1 13.1" />
        <path d="M13 12.5 V10.2" />
        <path d="M18.3 14.7 L19.9 13.1" />
      </g>
      <path
        d="M24.5 20 L26.5 20 L28.5 13.5 L31 26.5 L33 16.5 L34.8 20 L36.5 20"
        stroke={BLUE_LIGHT}
        strokeWidth="1.4"
      />
    </svg>
  )
}

/** Notice board with a live ping in the corner. */
export function ListingsIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps}>
      <rect x="5" y="12" width="22" height="20" rx="3" stroke={GREEN} strokeWidth="1.4" />
      <path d="M10 20 H22" stroke={GREEN_LIGHT} strokeWidth="1.4" />
      <path d="M10 26 H18" stroke={GREEN_LIGHT} strokeWidth="1.4" opacity="0.6" />
      <circle cx="32" cy="9" r="2.6" fill={GREEN_LIGHT} />
      <circle cx="32" cy="9" r="4.6" stroke={GREEN_LIGHT} strokeWidth="1.1" opacity="0.5" />
    </svg>
  )
}

// ── Party builder set — variations on the modal's gold ──────────────────

/** A single lit candle on a thin base, standing in for the whole cake. */
export function BirthdayIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <path
        d="M16 4.2 C18.4 7 19.3 8.6 19.3 10.2 C19.3 12 17.8 13.4 16 13.4 C14.2 13.4 12.7 12 12.7 10.2 C12.7 8.6 13.6 7 16 4.2 Z"
        stroke={GOLD_LIGHT}
        strokeWidth="1.4"
      />
      <path d="M16 13.6 V15.4" stroke={GOLD_LIGHT} strokeWidth="1.4" />
      <rect x="13" y="15.4" width="6" height="9.6" rx="1.6" stroke={GOLD} strokeWidth="1.4" />
      <path d="M8.5 27.4 H23.5" stroke={GOLD} strokeWidth="1.4" />
    </svg>
  )
}

/** Two thin rings caught mid-overlap. */
export function WeddingIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <circle cx="12.6" cy="19.2" r="6.2" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="19.4" cy="14.6" r="6.2" stroke={GOLD_LIGHT} strokeWidth="1.4" />
    </svg>
  )
}

/** Three bars of uneven height — half skyline, half bar chart. */
export function CorporateIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <path d="M8.5 25.5 V14.5" stroke={GOLD} strokeWidth="1.4" />
      <path d="M16 25.5 V7.5" stroke={GOLD_LIGHT} strokeWidth="1.4" />
      <path d="M23.5 25.5 V18.5" stroke={GOLD} strokeWidth="1.4" />
      <path d="M5.5 27.8 H26.5" stroke={GOLD} strokeWidth="1.4" opacity="0.45" />
    </svg>
  )
}

/** A burst going off — rays of uneven length around a bright centre. */
export function PrivatePartyIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <circle cx="16" cy="16" r="2" fill={GOLD_LIGHT} />
      <g stroke={GOLD} strokeWidth="1.4">
        <path d="M16 11 V5.5" />
        <path d="M20.3 13.5 L24.1 11.3" />
        <path d="M20.3 18.5 L25.1 21.3" />
        <path d="M16 21 V26.5" />
        <path d="M11.7 18.5 L7.9 20.7" />
        <path d="M11.7 13.5 L6.9 10.7" />
      </g>
    </svg>
  )
}

/** Waveform for a live set — the party-scale sibling of the gear waveform. */
export function LiveEventIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <path d="M4 16 H7.5" stroke={GOLD} strokeWidth="1.4" />
      <path d="M7.5 16 L10.5 8.5 L14.5 24 L18.5 11 L22 19.5 L24.5 16" stroke={GOLD} strokeWidth="1.4" />
      <path d="M24.5 16 H28" stroke={GOLD_LIGHT} strokeWidth="1.4" />
    </svg>
  )
}

/** A sparkle — big four-ray star with a small one trailing it. */
export function OtherIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <path d="M9.5 10.8 L21.7 23" stroke={GOLD} strokeWidth="1.4" />
      <path d="M21.7 10.8 L9.5 23" stroke={GOLD} strokeWidth="1.4" />
      <path d="M23.8 5.6 L27.6 9.4" stroke={GOLD_LIGHT} strokeWidth="1.2" />
      <path d="M27.6 5.6 L23.8 9.4" stroke={GOLD_LIGHT} strokeWidth="1.2" />
    </svg>
  )
}

/** Two heads and a pair of shoulders — the guest-count glyph. */
export function GuestsIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <circle cx="12" cy="12.6" r="4" stroke={GOLD} strokeWidth="1.4" />
      <path d="M6 25.5 C7 20.9 9.3 18.7 12 18.7 C14.7 18.7 17 20.9 18 25.5" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="21.4" cy="13.6" r="3.4" stroke={GOLD_LIGHT} strokeWidth="1.4" />
      <path d="M20.6 19.3 C23.1 19.3 25.2 21.3 26.2 25.5" stroke={GOLD_LIGHT} strokeWidth="1.4" />
    </svg>
  )
}

/** A bare light source throwing rays upward and sideways. */
export function LightingIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <circle cx="16" cy="16" r="4.5" stroke={GOLD} strokeWidth="1.4" />
      <g stroke={GOLD_LIGHT} strokeWidth="1.4">
        <path d="M16 9 V5.2" />
        <path d="M11 11 L8.4 8.4" />
        <path d="M21 11 L23.6 8.4" />
        <path d="M9 16 H5.2" />
        <path d="M23 16 H26.8" />
      </g>
    </svg>
  )
}

/** Coupe glass with the liquid line and one bubble. */
export function CateringIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <path d="M8.5 8 H23.5 L16 17.6 Z" stroke={GOLD} strokeWidth="1.4" />
      <path d="M16 17.6 V24.6" stroke={GOLD} strokeWidth="1.4" />
      <path d="M11.5 25.8 H20.5" stroke={GOLD} strokeWidth="1.4" />
      <path d="M11.4 11 H20.6" stroke={GOLD_LIGHT} strokeWidth="1.2" opacity="0.55" />
      <circle cx="18.2" cy="13.4" r="1.1" stroke={GOLD_LIGHT} strokeWidth="1.2" />
    </svg>
  )
}

/** Minimal camera — frame, lens, viewfinder dot. */
export function PhotoIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <rect x="7" y="8" width="18" height="18" rx="3" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="16" cy="17" r="4.6" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="21" cy="12.4" r="1" fill={GOLD_LIGHT} />
    </svg>
  )
}

/** Five curved petals round a bright centre. */
export function DecorIcon({ size = 22, className }: GlyphProps) {
  return (
    <svg width={size} height={size} className={className} {...svgProps32}>
      <g stroke={GOLD} strokeWidth="1.4">
        <ellipse cx="16" cy="10.6" rx="2.7" ry="4.6" />
        <ellipse cx="16" cy="10.6" rx="2.7" ry="4.6" transform="rotate(72 16 16)" />
        <ellipse cx="16" cy="10.6" rx="2.7" ry="4.6" transform="rotate(144 16 16)" />
        <ellipse cx="16" cy="10.6" rx="2.7" ry="4.6" transform="rotate(216 16 16)" />
        <ellipse cx="16" cy="10.6" rx="2.7" ry="4.6" transform="rotate(288 16 16)" />
      </g>
      <circle cx="16" cy="16" r="2" fill={GOLD_LIGHT} />
    </svg>
  )
}
