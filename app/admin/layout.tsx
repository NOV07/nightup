import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import AdminShell from '@/app/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthenticated = verifyAdminToken(cookieStore.get('admin_auth')?.value)

  // Unauthenticated, /admin renders the login form — it must not come wrapped
  // in the admin chrome.
  if (!isAuthenticated) return <>{children}</>

  return (
    <Suspense fallback={null}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  )
}
