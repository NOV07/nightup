import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function MagazineAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSWORD
  if (!isAuthenticated) redirect('/admin')
  return <>{children}</>
}
