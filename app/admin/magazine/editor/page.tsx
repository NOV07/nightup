'use client'

import { useCallback, useEffect, useReducer, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  EditorRoot,
  EditorContent,
  EditorBubble,
  EditorCommand,
  EditorCommandList,
  EditorCommandItem,
  EditorCommandEmpty,
  type EditorInstance,
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
  useEditor,
} from 'novel'
// novel bundles TipTap 2 while the project depends on 3. Marks are a plain
// { type: 'mark' } shape in both, and a v3 mark registers into novel's v2
// editor and round-trips correctly (verified against both copies), so these can
// come from the top-level v3 packages. Nodes and the schema helpers are the
// part that does not survive the version gap — see commit 420c0f6.
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import type { ArticleSource } from '@/app/lib/sanitizeArticle'

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
  // Both list types already ship in novel's StarterKit and work via the "- " /
  // "1. " input rules; these entries just make them discoverable.
  {
    title: 'Bullet List',
    description: 'Λίστα με κουκκίδες',
    searchTerms: ['bullet', 'list', 'ul', 'λίστα', 'κουκκίδες'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>•≡</span>,
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Αριθμημένη λίστα',
    searchTerms: ['numbered', 'ordered', 'list', 'ol', 'αριθμημένη', 'λίστα'],
    icon: <span style={{ fontFamily: 'monospace', fontSize: 11 }}>1.≡</span>,
    command: ({ editor, range }: any) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
]

// ── Inline formatting ─────────────────────────────────────────
/** Marks and list toggles, shared by the desktop bubble and the mobile bar. */
const FORMAT_ACTIONS: {
  name: string
  label: string
  title: string
  style?: React.CSSProperties
  run: (editor: EditorInstance) => void
}[] = [
  { name: 'bold',   label: 'B', title: 'Έντονα',        style: { fontWeight: 800 },
    run: e => e.chain().focus().toggleBold().run() },
  { name: 'italic', label: 'I', title: 'Πλάγια',        style: { fontStyle: 'italic', fontFamily: 'Georgia, serif' },
    run: e => e.chain().focus().toggleItalic().run() },
  { name: 'underline', label: 'U', title: 'Υπογράμμιση', style: { textDecoration: 'underline' },
    run: e => e.chain().focus().toggleUnderline().run() },
  { name: 'strike', label: 'S', title: 'Διαγραφή',      style: { textDecoration: 'line-through' },
    run: e => e.chain().focus().toggleStrike().run() },
  { name: 'bulletList',  label: '•≡',  title: 'Λίστα με κουκκίδες',
    run: e => e.chain().focus().toggleBulletList().run() },
  { name: 'orderedList', label: '1.≡', title: 'Αριθμημένη λίστα',
    run: e => e.chain().focus().toggleOrderedList().run() },
]

function toggleLink(editor: EditorInstance) {
  if (editor.isActive('link')) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  const previous = (editor.getAttributes('link').href as string) || ''
  const input = window.prompt('Σύνδεσμος (URL)', previous)
  if (input === null) return

  const trimmed = input.trim()
  if (!trimmed) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  // A bare domain is the common case; the sanitiser drops anything that is not
  // http(s) or mailto, so normalise rather than silently lose the link.
  const href = /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`
  editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
}

/** isActive() reads editor state directly, which React has no reason to
 *  re-read on its own — so the button row repaints on every transaction. */
function useEditorTick(editor: EditorInstance | null) {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!editor) return
    editor.on('transaction', bump)
    return () => { editor.off('transaction', bump) }
  }, [editor])
}

function FormatButtons({ compact = false }: { compact?: boolean }) {
  const { editor } = useEditor()
  useEditorTick(editor ?? null)
  if (!editor) return null

  const btn = (active: boolean): React.CSSProperties => ({
    minWidth: compact ? 38 : 30,
    height: compact ? 38 : 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(232,160,32,.16)' : 'transparent',
    border: 'none', borderRadius: 4, cursor: 'pointer',
    color: active ? '#E8A020' : '#EDE9E3',
    fontSize: compact ? 14 : 13, lineHeight: 1, padding: '0 6px',
  })

  return (
    <>
      {FORMAT_ACTIONS.map(action => (
        <button
          key={action.name}
          type="button"
          title={action.title}
          aria-label={action.title}
          aria-pressed={editor.isActive(action.name)}
          // Keeps the selection alive: without this the editor blurs on
          // mousedown and the range is gone before the click lands.
          onMouseDown={e => e.preventDefault()}
          onClick={() => action.run(editor)}
          style={{ ...btn(editor.isActive(action.name)), ...action.style }}
        >
          {action.label}
        </button>
      ))}
      <button
        type="button"
        title="Σύνδεσμος"
        aria-label="Σύνδεσμος"
        aria-pressed={editor.isActive('link')}
        onMouseDown={e => e.preventDefault()}
        onClick={() => toggleLink(editor)}
        style={btn(editor.isActive('link'))}
      >
        🔗
      </button>
    </>
  )
}

/** Mobile counterpart to the bubble. Native selection handles make a floating
 *  bubble unreliable on touch, so this is a fixed bar instead — shown whenever
 *  the editor has focus, which is exactly when it is needed and keeps it off
 *  the metadata sheet the rest of the time. */
function MobileFormatBar() {
  const { editor } = useEditor()
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!editor) return
    const on = () => setFocused(true)
    const off = () => setFocused(false)
    editor.on('focus', on)
    editor.on('blur', off)
    return () => { editor.off('focus', on); editor.off('blur', off) }
  }, [editor])

  if (!editor || !focused) return null

  return (
    <div
      className="md:hidden"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '6px 8px', overflowX: 'auto',
        background: '#1A1A28', borderTop: '1px solid rgba(255,255,255,.08)',
      }}
    >
      <FormatButtons compact />
    </div>
  )
}

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

// Articles are stored as HTML. Rows written before that switch hold a
// serialised TipTap JSON doc instead; TipTap accepts either shape as `content`,
// so we only need to tell them apart and let the editor re-emit HTML on save.
function parseStoredContent(raw: unknown): JSONContent | string | null {
  if (!raw) return null
  if (typeof raw !== 'string') return raw as JSONContent
  if (!raw.trimStart().startsWith('{')) return raw
  try {
    return JSON.parse(raw) as JSONContent
  } catch {
    return raw
  }
}

// ── Main editor ────────────────────────────────────────────────
function EditorInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const articleId = searchParams.get('id')

  const [content,      setContent]      = useState<JSONContent | string | null>(null)
  const [title,        setTitle]        = useState('')
  const [subtitle,     setSubtitle]     = useState('')
  const [category,     setCategory]     = useState('Features')
  const [series,       setSeries]       = useState('')
  const [tags,         setTags]         = useState('')
  const [heroImage,    setHeroImage]    = useState<string | null>(null)
  const [publishedAt,  setPublishedAt]  = useState('')
  const [featured,     setFeatured]     = useState(false)
  const [heroUploading, setHeroUploading] = useState(false)
  const [sources,      setSources]      = useState<ArticleSource[]>([])

  const [status,    setStatus]    = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [idRef,     setIdRef]     = useState<string | null>(articleId)

  // Mobile only: whether the metadata sheet is unfolded. Desktop renders the
  // sidebar open at all times and ignores this.
  const [fieldsOpen, setFieldsOpen] = useState(false)

  // Holds the editor's HTML, refreshed on every keystroke and once on mount.
  const contentRef = useRef<string | null>(null)
  const dirtyRef   = useRef(false)
  const idLive     = useRef<string | null>(articleId)

  // TipTap only reads `content` when the editor instance is created, so the
  // editor must not mount until the fetch below has resolved — otherwise it
  // comes up empty and the article's real content never reaches it.
  const [loaded, setLoaded] = useState(!articleId)

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
        setSources(Array.isArray(article.sources) ? article.sources : [])
        setContent(parseStoredContent(article.content))
      })
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [articleId])

  // The public navbar used to be hidden from here by hand. /admin no longer
  // renders it at all (see LayoutShell's STANDALONE_ROUTES), so nothing to do.

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
      // Blank rows are a half-typed entry, not data worth storing.
      sources: sources.filter(s => s.title.trim() || s.url.trim()),
      content: contentRef.current || null,
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

  // ── Sources ───────────────────────────────────────────────
  function mutateSources(next: ArticleSource[]) {
    setSources(next)
    dirtyRef.current = true
  }
  const addSource    = () => mutateSources([...sources, { title: '', url: '' }])
  const removeSource = (i: number) => mutateSources(sources.filter((_, n) => n !== i))
  const editSource   = (i: number, key: keyof ArticleSource, value: string) =>
    mutateSources(sources.map((s, n) => (n === i ? { ...s, [key]: value } : s)))
  const moveSource   = (i: number, delta: -1 | 1) => {
    const target = i + delta
    if (target < 0 || target >= sources.length) return
    const next = [...sources]
    ;[next[i], next[target]] = [next[target], next[i]]
    mutateSources(next)
  }

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
    // Not in novel's StarterKit (TipTap 2 keeps both as separate packages).
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
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
    // Flows inside the shared /admin shell rather than covering it, so the
    // admin sidebar stays visible while writing. pb clears the mobile nav.
    <div className="pb-20 md:pb-0" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0F0F1A' }}>

      {/* ── Status bar ── */}
      <div style={{ height: 2, background: statusColor, transition: 'background .3s', flexShrink: 0 }} />
      {statusMsg && status !== 'idle' && (
        // On mobile the shell's own header owns the top-right corner, so the
        // toast drops below it instead of sitting on the pending badge.
        <div className="fixed right-3 top-16 md:right-5 md:top-3" style={{
          zIndex: 10000,
          background: status === 'error' ? '#F87171' : '#34D399',
          color: '#08080F', padding: '5px 13px', borderRadius: 4,
          fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
          letterSpacing: '.08em', pointerEvents: 'none',
        }}>
          {statusMsg}
        </div>
      )}

      {/* ── Body ── */}
      {/* Column on phones so the sidebar can become a bottom sheet; the desktop
          row keeps its own overflow so only the editor scrolls. */}
      <div className="flex flex-col md:flex-row md:overflow-hidden" style={{ flex: 1 }}>

        {/* ── Left — Novel editor ── */}
        <div className="py-6 md:py-12 md:overflow-y-auto" style={{ flex: 1, minWidth: 0, minHeight: 0, background: '#0F0F1A' }}>
          {/* Getting back to the list must not require unfolding the sheet. */}
          <div className="md:hidden px-4 pb-3">
            <a href="/admin/magazine" style={{
              fontFamily: 'monospace', fontSize: 9, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'rgba(237,233,227,.35)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              ← Άρθρα
            </a>
          </div>
          <div className="px-4 md:px-8" style={{ maxWidth: 720, margin: '0 auto' }}>
            {!loaded ? null : (
            <EditorRoot>
              <EditorContent
                key={articleId ?? 'new'}
                className="novel-editor"
                // A legacy row may hand back a JSON doc rather than an HTML
                // string; TipTap takes both, novel's prop type only names one.
                initialContent={(content ?? undefined) as any}
                extensions={extensions}
                // Seeds the ref before the first keystroke, so saving an
                // untouched article rewrites what it already had — and
                // normalises a legacy JSON row to HTML on its next save.
                onCreate={({ editor }) => { contentRef.current = editor.getHTML() }}
                onUpdate={({ editor }) => {
                  contentRef.current = editor.getHTML()
                  dirtyRef.current = true
                }}
                editorProps={{
                  handlePaste: (view, e) => handleImagePaste(view, e, uploadFn),
                  handleDrop:  (view, e, _slice, moved) => handleImageDrop(view, e, moved, uploadFn),
                  attributes:  { class: 'novel-prose' },
                }}
              >
                {/* ── Inline formatting ── */}
                {/* Desktop: floats over the selection. Hidden on touch, where
                    MobileFormatBar takes over. */}
                <EditorBubble
                  tippyOptions={{ placement: 'top' }}
                  className="novel-bubble hidden md:flex"
                >
                  <FormatButtons />
                </EditorBubble>

                <MobileFormatBar />

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
            )}
          </div>
        </div>

        {/* ── Right — Sidebar (desktop) / bottom sheet (mobile) ── */}
        {/* sticky bottom-20 parks the sheet just above the shell's fixed mobile
            nav, which is what the outer pb-20 already clears. */}
        <aside
          className="sticky bottom-20 z-30 w-full border-t gap-0 md:static md:z-auto md:w-[280px] md:border-t-0 md:border-l md:gap-5 md:px-5 md:py-6 md:overflow-y-auto"
          style={{
            flexShrink: 0,
            background: '#1A1A28',
            borderColor: 'rgba(255,255,255,.08)',
            display: 'flex', flexDirection: 'column',
          }}
        >

          {/* Back link — the mobile copy lives on the editor column instead. */}
          <a href="/admin/magazine" className="hidden md:flex" style={{
            fontFamily: 'monospace', fontSize: 9, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'rgba(237,233,227,.35)',
            textDecoration: 'none', alignItems: 'center', gap: 5,
          }}>
            ← Άρθρα
          </a>

          {/* Sheet handle — mobile only */}
          <button
            onClick={() => setFieldsOpen(o => !o)}
            aria-expanded={fieldsOpen}
            className="md:hidden flex items-center justify-between w-full px-4 py-3"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 9, fontWeight: 600,
              letterSpacing: '.14em', textTransform: 'uppercase',
              color: 'rgba(237,233,227,.65)',
            }}
          >
            <span>✎ Στοιχεία άρθρου</span>
            <span>{fieldsOpen ? '▼' : '▲'}</span>
          </button>

          {/* Fields — folded away on mobile until asked for, always open on
              desktop. `hidden` rather than unmounting, so nothing resets. */}
          <div className={`${fieldsOpen ? 'flex' : 'hidden'} md:flex flex-col gap-5 max-h-[60vh] overflow-y-auto px-4 pb-4 md:max-h-none md:overflow-y-visible md:px-0 md:pb-0`}>

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

          {/* Sources */}
          <div>
            <Label>Πηγές ({sources.length})</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.map((source, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(255,255,255,.07)',
                    borderRadius: 4, padding: 8,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 10,
                      color: 'rgba(237,233,227,.35)', minWidth: 14,
                    }}>{i + 1}.</span>
                    <input
                      type="text"
                      value={source.title}
                      onChange={e => editSource(i, 'title', e.target.value)}
                      placeholder="Τίτλος πηγής"
                      style={inputStyle({ padding: '6px 8px', fontSize: 12 })}
                    />
                  </div>
                  <input
                    type="url"
                    value={source.url}
                    onChange={e => editSource(i, 'url', e.target.value)}
                    placeholder="https://…"
                    style={inputStyle({ padding: '6px 8px', fontSize: 11, fontFamily: 'monospace' })}
                  />
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {([['↑', -1], ['↓', 1]] as const).map(([glyph, delta]) => (
                      <button
                        key={glyph}
                        type="button"
                        onClick={() => moveSource(i, delta)}
                        disabled={delta === -1 ? i === 0 : i === sources.length - 1}
                        aria-label={delta === -1 ? 'Μετακίνηση πάνω' : 'Μετακίνηση κάτω'}
                        style={{
                          background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
                          borderRadius: 3, color: 'rgba(237,233,227,.6)',
                          fontSize: 10, padding: '2px 7px', cursor: 'pointer',
                          opacity: (delta === -1 ? i === 0 : i === sources.length - 1) ? .3 : 1,
                        }}
                      >{glyph}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeSource(i)}
                      aria-label="Αφαίρεση πηγής"
                      style={{
                        background: 'transparent', border: '1px solid rgba(248,113,113,.3)',
                        borderRadius: 3, color: '#F87171',
                        fontSize: 10, padding: '2px 7px', cursor: 'pointer',
                      }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSource}
              style={{
                width: '100%', marginTop: sources.length ? 8 : 0,
                background: 'rgba(255,255,255,.04)',
                border: '1px dashed rgba(255,255,255,.15)',
                borderRadius: 4, padding: '8px 0',
                color: 'rgba(237,233,227,.4)', cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 10, letterSpacing: '.06em',
              }}
            >+ Προσθήκη πηγής</button>
          </div>

          </div>{/* /fields */}

          {/* Actions — outside the collapsible block, so saving never costs a
              tap on the handle first. Side by side on mobile, stacked on desktop. */}
          <div className="flex flex-row gap-2 px-4 py-3 border-t md:flex-col md:gap-5 md:px-0 md:py-0 md:border-t-0"
            style={{ borderColor: 'rgba(255,255,255,.06)' }}>

          {/* Divider */}
          <div className="hidden md:block" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }} />

          {/* Buttons */}
          <button
            onClick={() => save('draft')}
            disabled={status === 'saving'}
            className="flex-1 md:flex-initial"
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
            className="flex-1 md:flex-initial"
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
          </div>{/* /actions */}
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
