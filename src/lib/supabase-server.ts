import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Server-side Supabase client using the service_role key.
 * This bypasses RLS — use only on the server for admin operations.
 * NEVER import this in client components.
 */
export function createServerSupabaseClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Singleton server client for use in server components and actions.
 */
let _serverClient: ReturnType<typeof createServerSupabaseClient> | null = null

export function getServerSupabase() {
  if (!_serverClient) {
    _serverClient = createServerSupabaseClient()
  }
  return _serverClient
}
