'use client'
import { useLanguage } from '@/app/components/LanguageContext'
import { NETWORK } from '@/app/lib/searchData'
import { TAB_META, type Profile } from '@/app/lib/networkProfile'
import CategorySectionsPage, { GOLD } from '@/components/network/CategorySectionsPage'

const VENUE_TYPES = Object.keys(NETWORK.Venues)

// One section, now with a filter chip per venue type. CategorySectionsPage
// hides a chip whose count is zero, so venues stored before the taxonomy
// existed (network_category '') simply show up unchipped under "All".
export default function VenuesPageClient({ profiles }: { profiles: Profile[] }) {
  const { t } = useLanguage()

  return (
    <CategorySectionsPage
      eyebrow="Venues"
      titleBefore={t('network_venues_hero_title')}
      titleEm={t('network_venues_hero_em')}
      subtitle={t('network_venues_subtitle')}
      sections={[
        {
          id: 'venues',
          icon: TAB_META.Venues.emoji,
          label: TAB_META.Venues.label,
          intro: t('network_gate_venues_desc'),
          accent: GOLD,
          subcategories: VENUE_TYPES,
          profiles,
        },
      ]}
    />
  )
}
