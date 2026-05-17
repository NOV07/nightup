'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function EditorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const articleId = searchParams.get('id')

  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  const postToEditor = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }, [])

  useEffect(() => {
    // Hide site nav when editor is open
    const nav = document.querySelector('header') || document.querySelector('nav')
    if (nav) nav.style.display = 'none'
    return () => {
      if (nav) nav.style.display = ''
    }
  }, [])

  useEffect(() => {
    if (!articleId) return
    fetch(`/api/articles/${articleId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(({ article }) => {
        if (!article) return
        const check = setInterval(() => {
          if (iframeRef.current?.contentWindow) {
            postToEditor({ type: 'LOAD_ARTICLE', article })
            clearInterval(check)
          }
        }, 200)
        setTimeout(() => clearInterval(check), 5000)
      })
      .catch(console.error)
  }, [articleId, postToEditor])

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (!e.data?.type) return

      switch (e.data.type) {

        case 'SAVE_DRAFT':
        case 'AUTOSAVE': {
          const article = e.data.article
          setStatus('saving')
          try {
            let res, data
            if (articleId) {
              res  = await fetch(`/api/articles/${articleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...article, status: 'draft' }), credentials: 'include' })
              data = await res.json()
            } else {
              res  = await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...article, status: 'draft' }), credentials: 'include' })
              data = await res.json()
              if (data.article?.id) router.replace(`/admin/magazine/editor?id=${data.article.id}`)
            }
            if (!res.ok) throw new Error(data.error || 'Save failed')
            setStatus('saved')
            setStatusMsg('Saved')
            postToEditor({ type: 'SAVE_OK', id: data.article?.id })
          } catch (err: any) {
            setStatus('error')
            setStatusMsg(err.message)
            postToEditor({ type: 'SAVE_ERROR', error: err.message })
          }
          setTimeout(() => setStatus('idle'), 3000)
          break
        }

        case 'PUBLISH': {
          const article = e.data.article
          setStatus('saving')
          try {
            let res, data
            if (articleId) {
              res  = await fetch(`/api/articles/${articleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...article, status: 'published' }), credentials: 'include' })
              data = await res.json()
            } else {
              res  = await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...article, status: 'published' }), credentials: 'include' })
              data = await res.json()
              if (data.article?.id) router.replace(`/admin/magazine/editor?id=${data.article.id}`)
            }
            if (!res.ok) throw new Error(data.error || 'Publish failed')
            setStatus('saved')
            setStatusMsg('Published ✓')
            postToEditor({ type: 'PUBLISH_OK', id: data.article?.id, slug: data.article?.slug })
          } catch (err: any) {
            setStatus('error')
            setStatusMsg(err.message)
            postToEditor({ type: 'PUBLISH_ERROR', error: err.message })
          }
          setTimeout(() => setStatus('idle'), 4000)
          break
        }

        case 'SCHEDULE': {
          const article = e.data.article
          try {
            let res, data
            const payload = { ...article, status: 'scheduled', scheduled_at: e.data.scheduled_at }
            if (articleId) {
              res  = await fetch(`/api/articles/${articleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
              data = await res.json()
            } else {
              res  = await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
              data = await res.json()
              if (data.article?.id) router.replace(`/admin/magazine/editor?id=${data.article.id}`)
            }
            if (!res.ok) throw new Error(data.error || 'Schedule failed')
            postToEditor({ type: 'SCHEDULE_OK' })
          } catch (err: any) {
            postToEditor({ type: 'SCHEDULE_ERROR', error: err.message })
          }
          break
        }

        case 'UPLOAD_IMAGE': {
          try {
            const { base64, mimeType, blockId, field } = e.data
            const blob = base64ToBlob(base64, mimeType)
            const form = new FormData()
            const ext  = mimeType.split('/')[1] || 'jpg'
            form.append('file', blob, `upload.${ext}`)
            const res  = await fetch('/api/articles/upload', { method: 'POST', body: form, credentials: 'include' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            postToEditor({ type: 'IMAGE_UPLOADED', url: data.url, blockId, field })
          } catch (err: any) {
            postToEditor({ type: 'IMAGE_ERROR', error: err.message })
          }
          break
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [articleId, postToEditor, router])

  function base64ToBlob(base64: string, mime: string): Blob {
    const b = atob(base64.split(',')[1] || base64)
    const arr = new Uint8Array(b.length)
    for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  const statusColor = { idle: '#666', saving: '#5B9CF6', saved: '#34D399', error: '#F87171' }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#080810', position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div style={{ height: 2, background: statusColor, transition: 'background .3s', opacity: status === 'idle' ? 0 : 1 }} />
      {statusMsg && status !== 'idle' && (
        <div style={{
          position: 'fixed', top: 60, right: 20, zIndex: 9999,
          background: status === 'error' ? '#F87171' : '#34D399',
          color: '#08080F', padding: '6px 14px', borderRadius: 3,
          fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
          letterSpacing: '.06em', pointerEvents: 'none',
        }}>
          {statusMsg}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/cms/editor.html"
        style={{ flex: 1, border: 'none', display: 'block', width: '100%' }}
        title="Nightup Magazine Editor"
      />
    </div>
  )
}

export default function MagazineEditorPage() {
  return (
    <Suspense fallback={<div style={{background:'#080810',height:'100vh'}}/>}>
      <EditorContent />
    </Suspense>
  )
}
