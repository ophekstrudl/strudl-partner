import { NextResponse } from 'next/server'
import { getBaristaCafe } from '@/lib/auth'

// Client-side gate: dashboard/page.tsx hits this on mount to figure out
// which state to render.
//   200 → { cafeId, cafeName, email } — show the dashboard
//   401 → session gone/expired (middleware will redirect on next nav)
//   403 → signed in but email isn't in cafe_users → send them to /unauthorized

export async function GET() {
  const barista = await getBaristaCafe()
  if (!barista) {
    // Distinguish "no session at all" from "session but not linked" by
    // calling supabaseServer here would let the client render a nicer
    // error. Keeping it simple for now — the client treats both as
    // "kick to unauthorized/login" and lets middleware sort it out.
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  return NextResponse.json({
    email: barista.email,
    cafeId: barista.cafeId,
    cafeName: barista.cafeName,
    role: barista.role,
  })
}
