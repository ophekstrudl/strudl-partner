import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-component / route-handler Supabase — reads the session cookie
// so we can identify the current barista. Never do privileged writes
// through this client; use admin.ts (service role) for anything the
// user shouldn't be able to do themselves.

export function supabaseServer() {
  const store = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            )
          } catch {
            // Server Components can't mutate cookies — middleware handles
            // session refresh, so this branch is a no-op in that path.
          }
        },
      },
    },
  )
}
