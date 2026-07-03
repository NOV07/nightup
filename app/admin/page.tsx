import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import AdminClient from './AdminClient'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAuthenticated = verifyAdminToken(cookieStore.get('admin_auth')?.value)

  if (!isAuthenticated) return <LoginForm />
  return <AdminClient />
}
