import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAdminToken } from '@/app/lib/adminAuth'

export default async function MagazineAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthenticated = verifyAdminToken(cookieStore.get('admin_auth')?.value)
  if (!isAuthenticated) redirect('/admin')
  return <>{children}</>
}
