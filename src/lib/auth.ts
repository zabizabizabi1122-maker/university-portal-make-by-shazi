import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createToken, verifyToken, type SessionPayload } from './jwt'
import { homeForRole, type Role } from './roles'

export { createToken }
export type { SessionPayload }

/** Reads and verifies the session cookie. Returns null when unauthenticated. */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** Redirects to /login when there is no valid session. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  return session
}

/** Redirects unauthenticated users to /login and other roles to their own dashboard. */
export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.role !== role) redirect(homeForRole(session.role))
  return session
}
