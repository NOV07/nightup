import { cookies } from 'next/headers'
import AdminClient from './AdminClient'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSWORD

  if (!isAuthenticated) return <LoginForm />
  return <AdminClient />
}
