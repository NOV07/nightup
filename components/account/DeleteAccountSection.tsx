'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useLanguage } from '@/app/components/LanguageContext'
import { useRegisterModalOpen } from '@/app/components/ModalStateContext'
import type { TranslationKey } from '@/app/lib/translations'

const DANGER = '#f87171'
const DANGER_SOLID = '#dc2626'

type Preview = {
  saved_events: number
  saved_spots: number
  going: number
  interested: number
  follows: number
  notifications: number
  spots: { id: string; name: string }[]
  events: number
  creator_gallery: number
  listings: number
  music_releases: number
}

/** Rows shown in the "what goes" list, in display order. Spots are listed by
 *  name; every other row is a label and a count, and zero counts are hidden. */
function previewRows(p: Preview, creator: boolean) {
  const counts: [TranslationKey, number][] = [
    ...(creator ? [
      ['delete_account_item_events', p.events],
      ['delete_account_item_gallery', p.creator_gallery],
      ['delete_account_item_listings', p.listings],
      ['delete_account_item_releases', p.music_releases],
    ] as [TranslationKey, number][] : []),
    ['delete_account_item_saved_events', p.saved_events],
    ['delete_account_item_saved_spots', p.saved_spots],
    ['delete_account_item_going', p.going],
    ['delete_account_item_interested', p.interested],
    ['delete_account_item_follows', p.follows],
    ['delete_account_item_notifications', p.notifications],
  ]
  return counts.filter(([, n]) => n > 0)
}

function ContentList({ preview, creator }: { preview: Preview; creator: boolean }) {
  const { t } = useLanguage()
  const rows = previewRows(preview, creator)
  const spots = creator ? preview.spots : []
  if (!rows.length && !spots.length) {
    return <p className="text-sm text-white/70">{t('delete_account_only_profile')}</p>
  }
  return (
    <ul className="text-sm divide-y divide-white/5">
      {spots.length > 0 && (
        <li className="flex justify-between gap-4 py-2">
          <span className="text-white/70">{t('delete_account_item_spots')}</span>
          <span className="text-white text-right font-medium">{spots.map(s => s.name).join(', ')}</span>
        </li>
      )}
      {rows.map(([key, n]) => (
        <li key={key} className="flex justify-between gap-4 py-2">
          <span className="text-white/70">{t(key)}</span>
          <span className="text-white font-medium tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  )
}

export default function DeleteAccountSection({ profileType }: { profileType: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const creator = profileType !== 'user'

  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useRegisterModalOpen('delete-account', open)

  async function loadPreview() {
    setPreviewError(false)
    try {
      const res = await fetch('/api/account', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      setPreview(await res.json())
    } catch {
      setPreviewError(true)
    }
  }

  // Creators see what they would lose before opening the sheet.
  useEffect(() => {
    if (creator) loadPreview()
  }, [creator])

  function openSheet() {
    setOpen(true)
    setPassword('')
    setError('')
    loadPreview()
  }

  function closeSheet() {
    if (deleting) return
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!password || deleting) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 403) {
        setError(t('delete_account_wrong_password'))
        setDeleting(false)
        return
      }
      if (!res.ok) {
        setError(t('delete_account_failed'))
        setDeleting(false)
        return
      }
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      // The auth user is already gone, so the server call may fail; the local
      // session is cleared either way.
      await supabase.auth.signOut().catch(() => {})
      router.replace('/?account_deleted=1')
      router.refresh()
    } catch {
      setError(t('delete_account_failed'))
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: '#111120', border: `1px solid ${DANGER}40` }}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: DANGER }}>{t('delete_account_title')}</h3>
        <p className="text-sm text-white/60">{t('delete_account_desc')}</p>

        {creator && preview && (
          <div className="rounded-lg px-4 py-2" style={{ backgroundColor: '#1A1A28' }}>
            <p className="text-xs text-white/50 pt-1">{t('delete_account_creator_lead')}</p>
            <ContentList preview={preview} creator />
          </div>
        )}

        <button
          type="button"
          onClick={openSheet}
          className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: DANGER, border: `1px solid ${DANGER}`, background: 'transparent' }}
        >
          {t('delete_account_button')}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70"
          onClick={closeSheet}
          role="presentation"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onSubmit={handleDelete}
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-lg sm:rounded-lg p-6 space-y-5"
            style={{ backgroundColor: '#111120', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <h2 id="delete-account-title" className="text-lg font-bold text-white">{t('delete_account_sheet_title')}</h2>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/50 mb-1">{t('delete_account_will_delete')}</p>
              {preview ? (
                <ContentList preview={preview} creator={creator} />
              ) : previewError ? (
                <p className="text-sm text-white/60">{t('delete_account_preview_error')}</p>
              ) : (
                <p className="text-sm text-white/40">{t('delete_account_loading')}</p>
              )}
            </div>

            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: `1px solid ${DANGER}55`, color: DANGER }}
            >
              {t('delete_account_warning')}
            </div>

            <div>
              <label htmlFor="delete-account-password" className="text-white/50 text-xs mb-1.5 block uppercase tracking-wider">
                {t('delete_account_password_label')}
              </label>
              <input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none text-sm"
                style={error ? { borderColor: DANGER } : undefined}
              />
              {error && <p className="text-sm mt-2" style={{ color: DANGER }}>{error}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={closeSheet}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#1A1A28', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {t('delete_account_cancel')}
              </button>
              <button
                type="submit"
                disabled={!password || deleting}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: DANGER_SOLID }}
              >
                {deleting ? t('delete_account_deleting') : t('delete_account_confirm')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
