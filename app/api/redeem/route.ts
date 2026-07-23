import { NextResponse } from 'next/server'
import { getBaristaCafe } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Barista types a STRDL-XXXX code from the customer → mark reward redeemed.
//
// Ported from Strudl-backoffice/api/redeem/index.ts. Difference: cafeId is
// resolved from the barista's authenticated session, not from a
// cafeToken URL param (which was the v1 back-office pattern). The
// atomic .is('redeemed_at', null) filter is preserved — refuses to
// double-redeem under a race.

export async function POST(request: Request) {
  const barista = await getBaristaCafe()
  if (!barista) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Not signed in as a barista.' }, { status: 403 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Malformed JSON.' }, { status: 400 })
  }
  if (!body.code) {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'code required' }, { status: 400 })
  }

  const code = body.code.trim().toUpperCase()
  const sb = supabaseAdmin()

  const { data: reward } = await sb
    .from('rewards')
    .select('id, user_id, redeemed_at')
    .eq('code', code)
    .maybeSingle()
  if (!reward) {
    return NextResponse.json({ error: 'UNKNOWN_CODE', message: 'No reward with that code.' }, { status: 404 })
  }
  if (reward.redeemed_at) {
    return NextResponse.json({ error: 'ALREADY_REDEEMED', message: 'This reward was already redeemed.' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const { data: updated, error: updErr } = await sb
    .from('rewards')
    .update({ redeemed_at: now, redeemed_cafe_id: barista.cafeId })
    .eq('id', reward.id)
    .is('redeemed_at', null)
    .select('id')
    .maybeSingle()
  if (updErr) {
    return NextResponse.json({ error: 'DB_ERROR', message: updErr.message }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'ALREADY_REDEEMED', message: 'This reward was just redeemed.' }, { status: 409 })
  }

  const { data: user } = await sb
    .from('users')
    .select('name')
    .eq('id', reward.user_id)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    userName: (user?.name as string) ?? 'Friend',
    redeemedAt: now,
    cafeName: barista.cafeName,
  })
}
