'use client'
import { useState } from 'react'
import SpotFormSteps, { spotFormToPayload, type SpotFormData } from '@/components/spots/SpotFormSteps'
import { spotToForm } from '@/app/lib/spotForm'

/**
 * Admin edit of a spot: the owner's wizard, saved through the admin route so
 * the spot does not have to belong to the admin. Used inside the admin Edit
 * modal.
 */
export default function AdminSpotEdit({ spot, onSaved }: { spot: Record<string, any>; onSaved: () => void | Promise<void> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Columns only the admin can change. status is derived from is_published and
  // geo is generated, so neither is sent.
  const [extras, setExtras] = useState({
    slug: String(spot.slug ?? ''),
    rating: spot.rating == null ? '' : String(spot.rating),
    featured: !!spot.featured,
    is_sponsored: !!spot.is_sponsored,
    is_published: spot.is_published === true,
  })

  async function handleSubmit(data: SpotFormData) {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...spotFormToPayload(data),
        slug: extras.slug.trim() || undefined,
        rating: extras.rating.trim() === '' ? null : Number(extras.rating),
        featured: extras.featured,
        is_sponsored: extras.is_sponsored,
        is_published: extras.is_published,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? `Failed to save (HTTP ${res.status})`)
      return
    }
    await onSaved()
  }

  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, outline: 'none', backgroundColor: '#0F0F1A', color: '#fff', border: '1px solid #444' }
  const check: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#E8A020' }

  return (
    <>
      <SpotFormSteps
        key={`admin-edit-spot-${spot.id}`}
        initialData={spotToForm(spot)}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        isEdit
        adminMode
      />
      {/* Sent with the wizard's Save button. Admin only, never in the owner form. */}
      <div data-testid="admin-spot-extras" style={{ maxWidth: 640, margin: '16px auto 0', padding: 16, borderRadius: 14, border: '1px solid rgba(232,160,32,0.35)', backgroundColor: '#111120' }}>
        <p style={{ ...label, color: '#E8A020', marginBottom: 12 }}>Admin</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={label} htmlFor="admin-spot-slug">Slug (public URL)</label>
            <input id="admin-spot-slug" style={input} value={extras.slug} onChange={e => setExtras(x => ({ ...x, slug: e.target.value }))} />
          </div>
          <div>
            <label style={label} htmlFor="admin-spot-rating">Rating (0–5)</label>
            <input id="admin-spot-rating" type="number" min={0} max={5} step="0.1" style={input} value={extras.rating} onChange={e => setExtras(x => ({ ...x, rating: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          <label style={check}><input type="checkbox" checked={extras.featured} onChange={e => setExtras(x => ({ ...x, featured: e.target.checked }))} /> Featured</label>
          <label style={check}><input type="checkbox" checked={extras.is_sponsored} onChange={e => setExtras(x => ({ ...x, is_sponsored: e.target.checked }))} /> Sponsored</label>
          <label style={check}><input type="checkbox" checked={extras.is_published} onChange={e => setExtras(x => ({ ...x, is_published: e.target.checked }))} /> Published</label>
        </div>
      </div>
    </>
  )
}
