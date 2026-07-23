import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase/server'

// Auth landing pad. Supabase sends users here after they click a link
// in an auth email. Two formats depending on the email type:
//   - Magic link (existing user):        ?code=<pkce>
//   - Confirm signup / invite (new user): ?token_hash=<x>&type=<signup|invite|magiclink|email>
// We handle both and drop the user at /dashboard once the session is set.

// Behind a reverse proxy (cloudflared, Vercel), the internal Host header
// often points at localhost while the browser is on an external URL.
// Trust the X-Forwarded-* headers if present so we redirect back to
// where the browser came from — otherwise the user gets bounced to
// http://localhost:PORT/dashboard, which Chrome auto-upgrades to HTTPS
// and fails.
function externalOrigin(request: NextRequest, fallback: string): string {
  const host = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : fallback
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const supabaseError = url.searchParams.get('error_code')
  const next = url.searchParams.get('next') ?? '/dashboard'
  const origin = externalOrigin(request, url.origin)
  const supabase = supabaseServer()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  const errorParam = supabaseError === 'otp_expired' ? 'expired' : 'auth'
  return NextResponse.redirect(new URL(`/dashboard/login?error=${errorParam}`, origin))
}
