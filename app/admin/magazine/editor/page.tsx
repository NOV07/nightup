'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandList,
  EditorCommandItem,
  EditorCommandEmpty,
  type JSONContent,
  StarterKit,
  Placeholder,
  HorizontalRule,
  UpdatedImage,
  Command,
  renderItems,
  createImageUpload,
  handleImagePaste,
  handleImageDrop,
} from 'novel'

// ── Upload helper ────────────────────────────────────────────
async function uploadToApi(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/articles/upload', { method: 'POST', body: form, credentials: 'include' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.url
}

const uploadFn = createImageUpload({
  validateFn: (file) => {
    if (!file.type.startsWith('image/')) throw new Error('Not an image')
    if (file.size > 4 * 1024 * 1024) throw new Error('Max 4 MB')
  },
  onUpload: uploadToApi,
})

// ── Slash commands ────────────────────────────────────────────
const slashItems = [
  {
    title: 'Heading 2',
    description: 'Τίτλος ενότητας',
    searchTerms: ['h2', 'heading', 'τίτλος'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>H2</span>,
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Υπότιτλος',
    searchTerms: ['h3', 'heading', 'υπότιτλος'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>H3</span>,
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Quote',
    description: 'Block quote',
    searchTerms: ['quote', 'blockquote', 'παράθεμα'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 14 }}>"</span>,
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Image',
    description: 'Εικόνα από αρχείο',
    searchTerms: ['image', 'img', 'εικόνα', 'photo'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>⌁</span>,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const url = await uploadToApi(file)
        editor.chain().focus().setImage({ src: url }).run()
      }
      input.click()
    },
  },
  {
    title: 'Divider',
    description: 'Οριζόντια γραμμή',
    searchTerms: ['hr', 'divider', 'rule', 'γραμμή'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>—</span>,
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
]

// ── Sidebar label ─────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'monospace', fontSize: 9, fontWeight: 600,
      letterSpacing: '.14em', textTransform: 'uppercase',
      color: 'rgba(237,233,227,.35)', marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%', background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.08)', borderRadius: 4,
    color: '#EDE9E3', padding: '8px 10px', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
    ...extra,
  }
}

const CATEGORIES = ['Interviews', 'Features', 'Guides', 'Venues', 'Music', 'Culture', 'Festival']

// ── Main editor ────────────────────────────────────────────────
function EditorInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const articleId = searchParams.get('id')

  const [content,      setContent]      = useState<JSONContent | null>(null)
  const [title,        setTitle]        = useState('')
  const [subtitle,     setSubtitle]     = useState('')
  const [category,     setCategory]     = useState('Features')
  const [series,       setSeries]       = useState('')
  const [tags,         setTags]         = useState('')
  const [heroImage,    setHeroImage]    = useState<string | null>(null)
  const [publishedAt,  setPublishedAt]  = useState('')
  const [featured,     setFeatured]     = useState(false)
  const [heroUploading, setHeroUploading] = useState(false)

  const [status,    setStatus]    = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [idRef,     setIdRef]     = useState<string | null>(articleId)

  const contentRef = useRef<JSONContent | null>(null)
  const dirtyRef   = useRef(false)
  const idLive     = useRef<string | null>(articleId)

  // keep live ref in sync
  useEffect(() => { idLive.current = idRef }, [idRef])

  // load existing article
  useEffect(() => {
    if (!articleId) return
    fetch(`/api/articles/${articleId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(({ article }) => {
        if (!article) return
        setTitle(article.title || '')
        setSubtitle(article.subtitle || '')
        setCategory(article.category || 'Features')
        setSeries(article.series || '')
        setTags((article.tags || []).join(', '))
        setHeroImage(article.hero_image || null)
        setPublishedAt(article.published_at ? article.published_at.slice(0, 10) : '')
        setFeatured(article.featured || false)
        if (article.content) {
          try {
            const parsed = typeof article.content === 'string'
              ? JSON.parse(article.content)
              : article.content
            setContent(parsed)
            contentRef.current = parsed
          } catch {}
        }
      })
      .catch(console.error)
  }, [articleId])

  // hide site nav
  useEffect(() => {
    const nav = document.querySelector('header') as HTMLElement | null
    if (nav) nav.style.display = 'none'
    return () => { if (nav) nav.style.display = '' }
  }, [])

  // ── Save helper ───────────────────────────────────────────
  const save = useCallback(async (articleStatus: 'draft' | 'published') => {
    setStatus('saving')
    setStatusMsg('')
    const payload = {
      title,
      subtitle: subtitle || null,
      category,
      series:   series || null,
      tags:     tags.split(',').map(t => t.trim()).filter(Boolean),
      hero_image: heroImage,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      featured,
      content: contentRef.current ? JSON.stringify(contentRef.current) : null,
      blocks:  [],
      status:  articleStatus,
    }

    try {
      let res: Response, data: any
      const currentId = idLive.current

      if (currentId) {
        res  = await fetch(`/api/articles/${currentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        })
        data = await res.json()
      } else {
        res  = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        })
        data = await res.json()
        if (data.article?.id) {
          setIdRef(data.article.id)
          router.replace(`/admin/magazine/editor?id=${data.article.id}`)
        }
      }

      if (!res!.ok) throw new Error(data.error || 'Save failed')
      dirtyRef.current = false
      setStatus('saved')
      setStatusMsg(articleStatus === 'published' ? 'Δημοσιεύτηκε ✓' : 'Αποθηκεύτηκε')
    } catch (err: any) {
      setStatus('error')
      setStatusMsg(err.message)
    }
    setTimeout(() => setStatus('idle'), 3500)
  }, [title, subtitle, category, series, tags, heroImage, publishedAt, featured, router])

  // autosave every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current) save('draft')
    }, 30_000)
    return () => clearInterval(interval)
  }, [save])

  // hero image upload
  async function handleHeroUpload(file: File) {
    setHeroUploading(true)
    try {
      const url = await uploadToApi(file)
      setHeroImage(url)
      dirtyRef.current = true
    } catch (err: any) {
      alert(err.message)
    } finally {
      setHeroUploading(false)
    }
  }

  // extensions (stable reference) — cast avoids novel/tiptap dual-module type conflict
  const extensions = [
    StarterKit,
    Placeholder.configure({ placeholder: 'Γράψε το άρθρο σου...' }),
    HorizontalRule,
    UpdatedImage,
    Command.configure({
      suggestion: {
        items: ({ query }: { query: string }) =>
          slashItems.filter(i =>
            i.title.toLowerCase().includes(query.toLowerCase()) ||
            i.searchTerms?.some(t => t.includes(query.toLowerCase()))
          ),
        render: renderItems,
      },
    }),
  ] as any[]

  const statusColor = { idle: 'transparent', saving: '#5B9CF6', saved: '#34D399', error: '#F87171' }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'fixed', inset: 0, zIndex: 9999, background: '#0F0F1A' }}>

      {/* ── Status bar ── */}
      <div style={{ height: 2, background: statusColor, transition: 'background .3s', flexShrink: 0 }} />
      {statusMsg && status !== 'idle' && (
        <div style={{
          position: 'fixed', top: 12, right: 20, zIndex: 10000,
          background: status === 'error' ? '#F87171' : '#34D399',
          color: '#08080F', padding: '5px 13px', borderRadius: 4,
          fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
          letterSpacing: '.08em', pointerEvents: 'none',
        }}>
          {statusMsg}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left — Novel editor ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0F0F1A', padding: '48px 0' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 32px' }}>
            <EditorRoot>
              <EditorContent
                key={articleId ?? 'new'}
                className="novel-editor"
                initialContent={content ?? undefined}
                extensions={extensions}
                onUpdate={({ editor }) => {
                  contentRef.current = editor.getJSON()
                  dirtyRef.current = true
                }}
                editorProps={{
                  handlePaste: (view, e) => handleImagePaste(view, e, uploadFn),
                  handleDrop:  (view, e, _slice, moved) => handleImageDrop(view, e, moved, uploadFn),
                  attributes:  { class: 'novel-prose' },
                }}
              >
                {/* ── Slash command menu ── */}
                <EditorCommand className="novel-slash-menu">
                  <EditorCommandEmpty style={{
                    padding: '8px 12px',
                    fontFamily: 'monospace', fontSize: 11,
                    color: 'rgba(237,233,227,.35)',
                  }}>
                    Δεν βρέθηκαν αποτελέσματα
                  </EditorCommandEmpty>
                  <EditorCommandList>
                    {slashItems.map(item => (
                      <EditorCommandItem
                        key={item.title}
                        value={item.title}
                        onCommand={item.command}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 12px', cursor: 'pointer',
                          borderRadius: 4,
                        }}
                        className="slash-item"
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                            background: 'rgba(255,255,255,.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#EDE9E3',
                          }}>
                            {item.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: '#EDE9E3', fontWeight: 500 }}>{item.title}</div>
                            <div style={{ fontSize: 11, color: 'rgba(237,233,227,.4)' }}>{item.description}</div>
                          </div>
                        </div>
                      </EditorCommandItem>
                    ))}
                  </EditorCommandList>
                </EditorCommand>
              </EditorContent>
            </EditorRoot>
          </div>
        </div>

        {/* ── Right — Sidebar ── */}
        <aside style={{
          width: 280, flexShrink: 0,
          background: '#1A1A28',
          borderLeft: '1px solid rgba(255,255,255,.08)',
          overflowY: 'auto', padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Back link */}
          <a href="/admin/magazine" style={{
            fontFamily: 'monospace', fontSize: 9, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'rgba(237,233,227,.35)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            ← Άρθρα
          </a>

          {/* Title */}
          <div>
            <Label>Τίτλος</Label>
            <textarea
              value={title}
              onChange={e => { setTitle(e.target.value); dirtyRef.current = true }}
              placeholder="Τίτλος άρθρου…"
              rows={2}
              style={{
                ...inputStyle(),
                fontFamily: "'Spectral', 'Georgia', serif",
                fontSize: 15, fontWeight: 600,
                resize: 'none', lineHeight: 1.4,
              }}
            />
          </div>

          {/* Subtitle */}
          <div>
            <Label>Υπότιτλος</Label>
            <textarea
              value={subtitle}
              onChange={e => { setSubtitle(e.target.value); dirtyRef.current = true }}
              placeholder="Υπότιτλος…"
              rows={2}
              style={{ ...inputStyle(), fontSize: 12, resize: 'none', lineHeight: 1.45 }}
            />
          </div>

          {/* Category */}
          <div>
            <Label>Κατηγορία</Label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); dirtyRef.current = true }}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Series */}
          <div>
            <Label>Series</Label>
            <input
              type="text"
              value={series}
              onChange={e => { setSeries(e.target.value); dirtyRef.current = true }}
              placeholder="π.χ. Recovery Blueprint"
              style={inputStyle()}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (κόμμα)</Label>
            <input
              type="text"
              value={tags}
              onChange={e => { setTags(e.target.value); dirtyRef.current = true }}
              placeholder="DJ, Greece, Festival"
              style={inputStyle()}
            />
          </div>

          {/* Hero image */}
          <div>
            <Label>Hero Image</Label>
            {heroImage ? (
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <img
                  src={heroImage}
                  alt=""
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                />
                <button
                  onClick={() => { setHeroImage(null); dirtyRef.current = true }}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,.7)', border: 'none', borderRadius: 3,
                    color: '#fff', fontSize: 10, padding: '3px 7px', cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >✕</button>
              </div>
            ) : null}
            <label style={{
              display: 'block',
              background: 'rgba(255,255,255,.04)',
              border: '1px dashed rgba(255,255,255,.15)',
              borderRadius: 4, padding: '10px 0',
              textAlign: 'center', cursor: heroUploading ? 'wait' : 'pointer',
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(237,233,227,.4)', letterSpacing: '.06em',
            }}>
              {heroUploading ? 'Μεταφόρτωση…' : '+ Επιλογή εικόνας'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                disabled={heroUploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f) }}
              />
            </label>
          </div>

          {/* Published at */}
          <div>
            <Label>Ημερομηνία δημοσίευσης</Label>
            <input
              type="date"
              value={publishedAt}
              onChange={e => { setPublishedAt(e.target.value); dirtyRef.current = true }}
              style={{ ...inputStyle(), colorScheme: 'dark' }}
            />
          </div>

          {/* Featured toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label>Προτεινόμενο</Label>
            <button
              onClick={() => { setFeatured(f => !f); dirtyRef.current = true }}
              style={{
                width: 38, height: 22, borderRadius: 11,
                background: featured ? '#E8A020' : 'rgba(255,255,255,.1)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background .2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: featured ? 18 : 3,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff',
                transition: 'left .2s',
              }} />
            </button>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)' }} />

          {/* Buttons */}
          <button
            onClick={() => save('draft')}
            disabled={status === 'saving'}
            style={{
              width: '100%', padding: '10px 0',
              background: 'transparent',
              border: '1px solid #E8A020',
              borderRadius: 4, color: '#E8A020',
              fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              cursor: status === 'saving' ? 'wait' : 'pointer',
            }}
          >
            {status === 'saving' ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>

          <button
            onClick={() => save('published')}
            disabled={status === 'saving'}
            style={{
              width: '100%', padding: '10px 0',
              background: '#E8A020', border: 'none',
              borderRadius: 4, color: '#08080F',
              fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              cursor: status === 'saving' ? 'wait' : 'pointer',
            }}
          >
            Δημοσίευση
          </button>
        </aside>
      </div>
    </div>
  )
}

export default function MagazineEditorPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0F0F1A', height: '100vh' }} />}>
      <EditorInner />
    </Suspense>
  )
}
