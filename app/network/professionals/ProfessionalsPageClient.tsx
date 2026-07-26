'use client'
import { NETWORK } from '@/app/lib/searchData'
import { useLanguage } from '@/app/components/LanguageContext'
import type { Profile } from '@/app/lib/networkProfile'
import CategorySectionsPage, { GOLD, BLUE } from '@/components/network/CategorySectionsPage'

const FOR_EVENTS_ROLES = Object.keys(NETWORK.Professionals['For Events'])
const FOR_ARTISTS_ROLES = Object.keys(NETWORK.Professionals['For Artists'])

const inGroup = (roles: string[], p: Profile) => roles.includes(p.network_category ?? '')

// The two taxonomy groups become the two sections of the page, each with its
// own accent: gold for the event side, blue for the artist side.
export default function ProfessionalsPageClient({ profiles }: { profiles: Profile[] }) {
  const { t } = useLanguage()

  const forEvents = profiles.filter(p => inGroup(FOR_EVENTS_ROLES, p))
  const forArtists = profiles.filter(p => inGroup(FOR_ARTISTS_ROLES, p))
  const ungrouped = profiles.filter(p => !inGroup(FOR_EVENTS_ROLES, p) && !inGroup(FOR_ARTISTS_ROLES, p))

  return (
    <CategorySectionsPage
      eyebrow="Professionals"
      titleBefore={t('network_pros_hero_title')}
      titleEm={t('network_pros_hero_em')}
      subtitle={t('network_pros_subtitle')}
      sections={[
        {
          id: 'events',
          icon: '🎉',
          label: t('network_group_for_events'),
          intro: t('network_pros_events_intro'),
          accent: GOLD,
          subcategories: FOR_EVENTS_ROLES,
          profiles: forEvents,
        },
        {
          id: 'artists-pros',
          icon: '🎤',
          label: t('network_group_for_artists'),
          intro: t('network_pros_artists_intro'),
          accent: BLUE,
          subcategories: FOR_ARTISTS_ROLES,
          profiles: forArtists,
        },
        // Anything whose network_category is outside both groups still shows up.
        {
          id: 'other-pros',
          icon: '🤝',
          label: t('network_all'),
          intro: t('network_gate_pros_desc'),
          accent: GOLD,
          subcategories: [],
          profiles: ungrouped,
        },
      ]}
    />
  )
}
