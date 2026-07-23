import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase — bypasses RLS. Server-only. Use for privileged
// writes (stamp insertion, cafe_users lookups by email, etc.) after the
// barista's identity has been verified via supabaseServer().

let _client: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}
