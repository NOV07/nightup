'use client'
import { useLanguage } from '@/app/components/LanguageContext'
import { TAB_META, type Profile } from '@/app/lib/networkProfile'
import CategorySectionsPage, { GOLD } from '@/components/network/CategorySectionsPage'

// Venues has no subcategory taxonomy in NETWORK yet, so the single section
// carries no chips.
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
          subcategories: [],
          profiles,
        },
      ]}
    />
  )
}
