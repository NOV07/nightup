'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLanguage } from './LanguageContext'

/** Shows the goodbye toast after a self-service account deletion
 *  (components/account/DeleteAccountSection redirects to /?account_deleted=1),
 *  then drops the query. Reads location directly instead of useSearchParams so
 *  the ISR home page does not need a Suspense boundary for it. */
export default function AccountDeletedToast() {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('account_deleted') !== '1') return
    // Fixed id: StrictMode runs this effect twice in dev.
    toast.success(t('delete_account_done_toast'), { id: 'account-deleted', duration: 6000 })
    router.replace('/', { scroll: false })
  }, [router, t])

  return null
}
