import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Runs on every request under the matcher. Two jobs:
//   1. Refresh the Supabase session cookie (must happen on every server
//      round-trip, otherwise the session silently expires).
//   2. Gate the authenticated dashboard surface — unauthenticated users
//      trying to hit /dashboard/* (except login and callback) get bounced
//      to /dashboard/login.
//
// The cafe_users check (is this email actually a barista?) happens in
// lib/auth.ts inside pages/routes — not here. The middleware only knows
// "is there a session at all."

const PUBLIC_DASHBOARD_PATHS = new Set([
  '/dashboard/login',
  '/dashboard/auth/callback',
  '/dashboard/unauthorized',
])

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  const isPublic = PUBLIC_DASHBOARD_PATHS.has(path)

  if (isDashboard && !isPublic && !user) {
    // Behind cloudflared / any reverse proxy, request.nextUrl.origin
    // points at the internal Host (localhost). Use X-Forwarded-* so the
    // redirect lands the user back on the external URL they came from.
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
    const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin
    return NextResponse.redirect(new URL('/dashboard/login', origin))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
