import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getFacultyData } from '@/lib/queries'
import FacultyDashboard from './FacultyDashboard'

export const dynamic = 'force-dynamic'

export default async function FacultyPage() {
  const session = await requireRole('FACULTY')
  const data = await getFacultyData(session.userId)

  if (!data) notFound()

  return <FacultyDashboard session={session} data={data} />
}
