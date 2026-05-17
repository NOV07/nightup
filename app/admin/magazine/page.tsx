'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Article = {
  id: string
  title: string
  subtitle: string | null
  slug: string
  category: string
  series: string | null
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  featured: boolean
  published_at: string | null
  updated_at: string
  word_count: number
  read_time: number
  tags: string[]
  hero_image: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft:     '#666',
  published: '#E8A020',
  scheduled: '#5B9CF6',
  archived:  '#444',
}

export default function MagazineAdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<string>('all')

  useEffect(() => {
    fetch('/api/articles')
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    if (res.ok) setArticles(prev => prev.filter(a => a.id !== id))
  }

  async function handleUnpublish(id: string) {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    })
    if (res.ok) {
      const { article } = await res.json()
      setArticles(prev => prev.map(a => a.id === id ? { ...a, status: article.status } : a))
    }
  }

  const filtered = filter === 'all' ? articles : articles.filter(a => a.status === filter)
  const counts = {
    all:       articles.length,
    draft:     articles.filter(a => a.status === 'draft').length,
    published: articles.filter(a => a.status === 'published').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#E8A020', marginBottom: 6 }}>
            Nightup Magazine
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 36, fontWeight: 700, color: '#EDE9E3' }}>
            Articles
          </h1>
        </div>
        <Link href="/admin/magazine/editor" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: '#E8A020', color: '#08080F',
          fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
          letterSpacing: '.12em', textTransform: 'uppercase',
          padding: '10px 18px', borderRadius: 2, textDecoration: 'none',
        }}>
          + New Article
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 16 }}>
        {(['all','published','draft','scheduled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontFamily: 'monospace', fontSize: 9, fontWeight: 500,
            letterSpacing: '.12em', textTransform: 'uppercase',
            padding: '6px 13px', borderRadius: 2, border: 'none',
            background: filter === f ? '#E8A020' : 'rgba(255,255,255,.05)',
            color: filter === f ? '#08080F' : 'rgba(237,233,227,.45)',
            cursor: 'pointer',
          }}>
            {f} ({counts[f as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(237,233,227,.3)', fontFamily: 'monospace', fontSize: 12 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, color: 'rgba(237,233,227,.3)', marginBottom: 12 }}>
            No articles yet
          </div>
          <Link href="/admin/magazine/editor" style={{ color: '#E8A020', fontFamily: 'monospace', fontSize: 11 }}>
            Create your first article →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '16px 20px',
              background: '#0D0D1A',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 3,
            }}>
              <div style={{
                width: 56, height: 40, borderRadius: 2, flexShrink: 0,
                background: 'linear-gradient(135deg,#1C1035,#0B0B18)', overflow: 'hidden',
              }}>
                {a.hero_image && <img src={a.hero_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 8, fontWeight: 500,
                    letterSpacing: '.14em', textTransform: 'uppercase',
                    color: STATUS_COLORS[a.status] || '#666',
                    background: a.status === 'published' ? 'rgba(232,160,32,.1)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${STATUS_COLORS[a.status] || 'rgba(255,255,255,.1)'}`,
                    padding: '2px 7px', borderRadius: 1,
                  }}>
                    {a.status}
                  </span>
                  {a.featured && <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#E8A020' }}>★ FEATURED</span>}
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(237,233,227,.3)' }}>
                    {a.category}{a.series ? ` · ${a.series}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#EDE9E3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.title || 'Untitled'}
                </div>
                {a.subtitle && (
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, fontStyle: 'italic', color: 'rgba(237,233,227,.45)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.subtitle}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(237,233,227,.45)' }}>
                    {a.word_count} words · {a.read_time} min
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(237,233,227,.25)', marginTop: 2 }}>
                    {a.published_at
                      ? `Published ${new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : `Updated ${new Date(a.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <Link href={`/admin/magazine/editor?id=${a.id}`} style={{
                    fontFamily: 'monospace', fontSize: 9, padding: '6px 11px',
                    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 2, color: 'rgba(237,233,227,.65)', textDecoration: 'none',
                  }}>Edit</Link>
                  {a.status === 'published' && (
                    <Link href={`/magazine/${a.slug || a.id}`} target="_blank" style={{
                      fontFamily: 'monospace', fontSize: 9, padding: '6px 11px',
                      background: 'rgba(232,160,32,.08)', border: '1px solid rgba(232,160,32,.25)',
                      borderRadius: 2, color: '#E8A020', textDecoration: 'none',
                    }}>View ↗</Link>
                  )}
                  {a.status === 'published' && (
                    <button onClick={() => handleUnpublish(a.id)} style={{
                      fontFamily: 'monospace', fontSize: 9, padding: '6px 11px',
                      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 2, color: 'rgba(237,233,227,.35)', cursor: 'pointer',
                    }}>Unpublish</button>
                  )}
                  <button onClick={() => handleDelete(a.id, a.title)} style={{
                    fontFamily: 'monospace', fontSize: 9, padding: '6px 11px',
                    background: 'rgba(248,113,113,.05)', border: '1px solid rgba(248,113,113,.2)',
                    borderRadius: 2, color: 'rgba(248,113,113,.7)', cursor: 'pointer',
                  }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
