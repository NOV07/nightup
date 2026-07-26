'use client'
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/app/components/LanguageContext'
import type { Profile } from '@/app/lib/networkProfile'
import CinematicHero from '@/components/network/CinematicHero'
import ProfileCard from '@/components/network/ProfileCard'

export const GOLD = '#E8A020'
export const BLUE = '#60A5FA'

export interface CategorySection {
  id: string
  /** Emoji shown in the sticky chip and next to the section label. */
  icon: string
  label: string
  /** One-sentence intro under the section label. */
  intro: string
  /** Section accent colour — cards, underline and chips follow it. */
  accent: string
  /** Chips inside the section; empty for taxonomies without subcategories. */
  subcategories: readonly string[]
  profiles: Profile[]
}

interface Props {
  eyebrow: string
  titleBefore: string
  titleEm: string
  subtitle: string
  sections: CategorySection[]
}

function chipStyle(active: boolean, accent: string): React.CSSProperties {
  const soft = accent === GOLD ? 'rgba(232,160,32,0.12)' : 'rgba(96,165,250,0.12)'
  const line = accent === GOLD ? 'rgba(232,160,32,0.15)' : 'rgba(96,165,250,0.2)'
  return {
    whiteSpace: 'nowrap',
    fontSize: 12.5,
    fontWeight: 600,
    color: active ? accent : '#A1A1AA',
    background: active ? soft : '#1A1A28',
    border: `1px solid ${active ? line : 'rgba(255,255,255,0.06)'}`,
    padding: '7px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all .2s',
  }
}

// Section-scroll page: sticky chips jump between sections rather than
// filtering, and each subcategory filter lives inside its own section.
export default function CategorySectionsPage({
  eyebrow, titleBefore, titleEm, subtitle, sections,
}: Props) {
  const { t } = useLanguage()
  const visible = sections.filter(s => s.profiles.length > 0)

  const [active, setActive] = useState(visible[0]?.id ?? '')
  const [subFilter, setSubFilter] = useState<Record<string, string | null>>({})
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const jump = (id: string) => {
    setActive(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const visibleIds = visible.map(s => s.id).join(',')

  useEffect(() => {
    const ids = visibleIds.split(',').filter(Boolean)
    if (ids.length === 0) return
    const onScroll = () => {
      let cur = ids[0]
      for (const id of ids) {
        const el = sectionRefs.current[id]
        if (el && window.scrollY >= el.offsetTop - 160) cur = id
      }
      setActive(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [visibleIds])

  return (
    <div style={{ background: '#0F0F1A', minHeight: '100vh' }}>
      <CinematicHero
        eyebrow={eyebrow}
        titleBefore={titleBefore}
        titleEm={titleEm}
        subtitle={subtitle}
        backHref="/network"
        backLabel="← Network"
      />

      {/* Sticky section bar — chips scroll to their section */}
      {visible.length > 1 && (
        <div style={{ position: 'sticky', top: 60, zIndex: 30, background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '14px 24px', display: 'flex', gap: 9, overflowX: 'auto' }} className="nw-hide-scroll">
            {visible.map(s => (
              <button key={s.id} onClick={() => jump(s.id)} style={chipStyle(active === s.id, s.accent)}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 24px' }}>
        {visible.map(section => {
          const sub = subFilter[section.id] ?? null
          const shown = sub
            ? section.profiles.filter(p => p.network_category === sub)
            : section.profiles

          return (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el }}
              style={{ padding: '40px 0 8px', scrollMarginTop: 130 }}
            >
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{section.icon}</span>
                      {section.label}
                    </p>
                    <div style={{ width: 24, height: 1, background: section.accent, marginTop: 6 }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                    {shown.length} {shown.length === 1 ? t('network_results_one') : t('network_results_many')}
                  </span>
                </div>
                <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 620 }}>
                  {section.intro}
                </p>
              </div>

              {section.subcategories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  <button
                    onClick={() => setSubFilter(p => ({ ...p, [section.id]: null }))}
                    style={chipStyle(!sub, section.accent)}
                  >
                    {t('network_all')}
                  </button>
                  {section.subcategories.map(name => {
                    const n = section.profiles.filter(p => p.network_category === name).length
                    if (n === 0) return null
                    const on = sub === name
                    return (
                      <button
                        key={name}
                        onClick={() => setSubFilter(p => ({ ...p, [section.id]: on ? null : name }))}
                        style={chipStyle(on, section.accent)}
                      >
                        {name} · {n}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="nw-grid">
                {shown.map(p => <ProfileCard key={p.id} profile={p} accent={section.accent} />)}
              </div>
            </div>
          )
        })}
        <div style={{ height: 60 }} />
      </div>

      <style jsx>{`
        .nw-hide-scroll::-webkit-scrollbar { display: none; }
        .nw-hide-scroll { scrollbar-width: none; }
        .nw-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        @media (max-width: 900px) { .nw-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .nw-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
