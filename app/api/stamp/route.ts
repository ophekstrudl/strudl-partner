import { NextResponse } from 'next/server'
import { getBaristaCafe } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyStampToken } from '@/lib/stampToken'

// Barista scans a customer QR → stamp lands.
//
// Auth: session cookie (magic-link) + cafe_users allowlist. cafeId is
// resolved from the barista's session, NEVER trusted from the client —
// otherwise a barista at café A could stamp for café B.
//
// Body: { stampToken } — the JWT the customer app displayed. Verified
// with the shared STAMP_TOKEN_SECRET; expiry (45s TTL) is enforced there.
//
// Stamp insert + reward-unlock happen atomically inside the Postgres
// add_stamp() function (see supabase/schema.sql). This route just
// handles auth, token verify, anti-double-stamp, and shape adaptation.

const DOUBLE_STAMP_WINDOW_SECONDS = 60

interface AddStampResult {
  stamp_id: string
  scanned_at: string
  current_stamps: number
  reward_id: string | null
  reward_code: string | null
  reward_unlocked_at: string | null
}

export async function POST(request: Request) {
  const barista = await getBaristaCafe()
  if (!barista) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Not signed in as a barista.' }, { status: 403 })
  }

  let body: { stampToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Malformed JSON.' }, { status: 400 })
  }
  if (!body.stampToken) {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'stampToken required.' }, { status: 400 })
  }

  const payload = verifyStampToken(body.stampToken)
  if (!payload) {
    return NextResponse.json(
      { error: 'INVALID_TOKEN', message: "This code is expired or invalid. Ask the customer to refresh their code." },
      { status: 401 },
    )
  }

  const sb = supabaseAdmin()

  const { data: user } = await sb
    .from('users')
    .select('id, name')
    .eq('id', payload.userId)
    .maybeSingle()
  if (!user) {
    return NextResponse.json({ error: 'UNKNOWN_USER', message: 'Unknown customer.' }, { status: 404 })
  }

  // Anti-double-stamp: same customer at same café within the window.
  // Kept in TypeScript rather than the RPC because it's a business rule
  // only the barista scanner cares about — the debug endpoint deliberately
  // bypasses it for testing.
  const cutoff = new Date(Date.now() - DOUBLE_STAMP_WINDOW_SECONDS * 1000).toISOString()
  const { data: recent } = await sb
    .from('stamps')
    .select('id')
    .eq('user_id', user.id)
    .eq('cafe_id', barista.cafeId)
    .gte('scanned_at', cutoff)
    .limit(1)
    .maybeSingle()
  if (recent) {
    return NextResponse.json(
      { error: 'DUPLICATE_STAMP', message: 'Already stamped in the last minute.' },
      { status: 409 },
    )
  }

  // Atomic: stamp insert + reward-unlock check + reward mint + stamp
  // grouping, all inside a single transaction with an advisory lock on
  // the user id. No race can double-mint rewards for concurrent scans.
  const { data, error } = await sb.rpc('add_stamp', {
    p_user_id: user.id,
    p_cafe_id: barista.cafeId,
  })
  if (error || !data) {
    return NextResponse.json(
      { error: 'DB_ERROR', message: error?.message ?? 'add_stamp failed' },
      { status: 500 },
    )
  }
  const result = data as AddStampResult

  return NextResponse.json({
    ok: true,
    userName: user.name as string,
    currentStamps: result.current_stamps,
    rewardUnlocked: result.reward_code ? { code: result.reward_code } : null,
  })
}
