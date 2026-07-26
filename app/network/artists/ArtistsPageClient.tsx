'use client'
import { NETWORK } from '@/app/lib/searchData'
import { useLanguage } from '@/app/components/LanguageContext'
import { TAB_META, type Profile } from '@/app/lib/networkProfile'
import CategorySectionsPage, { GOLD } from '@/components/network/CategorySectionsPage'

const SUBCATEGORIES = Object.keys(NETWORK.Artists)

export default function ArtistsPageClient({ profiles }: { profiles: Profile[] }) {
  const { t } = useLanguage()

  return (
    <CategorySectionsPage
      eyebrow="Artists"
      titleBefore={t('network_artists_hero_title')}
      titleEm={t('network_artists_hero_em')}
      subtitle={t('network_artists_subtitle')}
      sections={[
        {
          id: 'artists',
          icon: TAB_META.Artists.emoji,
          label: TAB_META.Artists.label,
          intro: t('network_gate_artists_desc'),
          accent: GOLD,
          subcategories: SUBCATEGORIES,
          profiles,
        },
      ]}
    />
  )
}
