import { createClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client using the anon key.
 * Used for Realtime subscriptions only.
 * RLS policies control data access.
 */
let _browserClient: ReturnType<typeof createClient> | null = null

export function getBrowserSupabase() {
  if (_browserClient) return _browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables for browser client')
  }

  _browserClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _browserClient
}
