'use client'
import {
  SPOT_CATEGORIES, MAX_SPOT_CATEGORIES, MAX_SPOT_SUBCATEGORIES,
  toggleSpotCategory, makePrimaryCategory, toggleSpotSub, type TaxonomyPick,
} from '@/app/lib/spotCategories'

const chip = (on: boolean, blocked: boolean): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: blocked ? 'not-allowed' : 'pointer',
  opacity: blocked ? 0.4 : 1,
  backgroundColor: on ? 'rgba(232,160,32,0.18)' : 'rgba(255,255,255,0.05)',
  color: on ? '#E8A020' : 'rgba(255,255,255,0.55)',
  border: `1px solid ${on ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.12)'}`,
})

/**
 * Compact category/subcategory picker for the admin panel (English labels, like
 * the rest of /admin). Same rules as the owner wizard: up to 3 categories with
 * the first one primary, up to 3 subcategories from the picked categories.
 */
export default function SpotTaxonomyPicker({ value, onChange, labelCls }: {
  value: TaxonomyPick
  onChange: (next: TaxonomyPick) => void
  labelCls: string
}) {
  const atMaxCats = value.categories.length >= MAX_SPOT_CATEGORIES
  const atMaxSubs = value.subcategories.length >= MAX_SPOT_SUBCATEGORIES
  return (
    <div className="sm:col-span-2 space-y-3" data-testid="admin-spot-taxonomy">
      <div>
        <label className={labelCls}>Categories ({value.categories.length}/{MAX_SPOT_CATEGORIES}, first = primary) *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPOT_CATEGORIES.map(c => {
            const on = value.categories.includes(c.key)
            const primary = value.categories[0] === c.key
            const blocked = !on && atMaxCats
            return (
              <span key={c.key} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <button type="button" disabled={blocked} aria-pressed={on}
                  data-testid={`admin-spot-cat-${c.key}`}
                  onClick={() => onChange(toggleSpotCategory(value, c.key))}
                  style={chip(on, blocked)}>
                  {c.label_en}{primary ? ' ★' : ''}
                </button>
                {on && !primary && (
                  <button type="button" data-testid={`admin-spot-primary-${c.key}`}
                    onClick={() => onChange(makePrimaryCategory(value, c.key))}
                    style={{ fontSize: 10, color: '#E8A020', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                    make primary
                  </button>
                )}
              </span>
            )
          })}
        </div>
      </div>
      {value.categories.length > 0 && (
        <div>
          <label className={labelCls}>Subcategories ({value.subcategories.length}/{MAX_SPOT_SUBCATEGORIES})</label>
          {value.categories.map(catKey => {
            const def = SPOT_CATEGORIES.find(c => c.key === catKey)
            if (!def) return null
            return (
              <div key={catKey} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{def.label_en}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {def.subs.map(sub => {
                    const on = value.subcategories.includes(sub.key)
                    const blocked = !on && atMaxSubs
                    return (
                      <button key={sub.key} type="button" disabled={blocked} aria-pressed={on}
                        data-testid={`admin-spot-sub-${sub.key}`}
                        onClick={() => onChange(toggleSpotSub(value, sub.key))}
                        style={chip(on, blocked)}>
                        {sub.label_en}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
