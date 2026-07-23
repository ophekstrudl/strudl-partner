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
// Duplicated from Strudl-app/api/scan.ts: reward-unlock logic. Once we
// have a 3rd stamping surface, refactor into a Postgres function.

const STAMPS_REQUIRED_FOR_REWARD = 9
const REWARD_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY23456789'
const DOUBLE_STAMP_WINDOW_SECONDS = 60

function newRewardCode(): string {
  let s = 'STRDL-'
  for (let i = 0; i < 4; i++) {
    s += REWARD_CODE_ALPHABET[Math.floor(Math.random() * REWARD_CODE_ALPHABET.length)]
  }
  return s
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

  const { data: stamp, error: stampErr } = await sb
    .from('stamps')
    .insert({ user_id: user.id, cafe_id: barista.cafeId })
    .select('id, scanned_at')
    .single()
  if (stampErr || !stamp) {
    return NextResponse.json(
      { error: 'DB_ERROR', message: stampErr?.message ?? 'stamp insert failed' },
      { status: 500 },
    )
  }

  // Count uncashed → maybe unlock reward.
  const { count } = await sb
    .from('stamps')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('reward_id', null)
  const uncashed = count ?? 0

  let rewardUnlocked: { code: string } | null = null
  let currentStamps = uncashed

  if (uncashed >= STAMPS_REQUIRED_FOR_REWARD) {
    let code = ''
    for (let i = 0; i < 5; i++) {
      const candidate = newRewardCode()
      const { count: collision } = await sb
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('code', candidate)
      if ((collision ?? 0) === 0) {
        code = candidate
        break
      }
    }
    if (!code) {
      return NextResponse.json(
        { error: 'CODE_GEN', message: 'Could not generate unique reward code.' },
        { status: 500 },
      )
    }

    const { data: reward, error: rewardErr } = await sb
      .from('rewards')
      .insert({ user_id: user.id, code })
      .select('id, code')
      .single()
    if (rewardErr || !reward) {
      return NextResponse.json(
        { error: 'DB_ERROR', message: rewardErr?.message ?? 'reward insert failed' },
        { status: 500 },
      )
    }

    // Tag the N oldest uncashed stamps with this reward.
    const { data: oldStamps } = await sb
      .from('stamps')
      .select('id')
      .eq('user_id', user.id)
      .is('reward_id', null)
      .order('scanned_at', { ascending: true })
      .limit(STAMPS_REQUIRED_FOR_REWARD)
    if (oldStamps?.length === STAMPS_REQUIRED_FOR_REWARD) {
      await sb
        .from('stamps')
        .update({ reward_id: reward.id })
        .in('id', oldStamps.map((s) => s.id as string))
    }

    rewardUnlocked = { code: reward.code as string }
    currentStamps = uncashed - STAMPS_REQUIRED_FOR_REWARD
  }

  return NextResponse.json({
    ok: true,
    userName: user.name as string,
    currentStamps,
    rewardUnlocked,
  })
}
