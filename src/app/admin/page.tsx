import { requireRole } from '@/lib/auth'
import { getAdminData } from '@/lib/queries'
import AdminDashboard from './AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await requireRole('ADMIN')
  const data = await getAdminData()

  return <AdminDashboard session={session} data={data} />
}
