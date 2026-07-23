import { createBrowserClient } from '@supabase/ssr'

// Client-component Supabase — used only by the login page to fire off
// magic-link OTP requests. Everything else on the barista side goes
// through server components / route handlers.

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
