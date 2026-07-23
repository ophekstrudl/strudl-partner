import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Café-partner self-serve signup. The café owner enters name + email +
// code on the landing page; we look up the invitation, confirm the
// email matches, insert into cafe_users, and mark the invitation used.
// The client then fires supabase.auth.signInWithOtp() with the same
// email to deliver the magic link — reusing the existing login pipe.
//
// Idempotency: if the (cafe_id, email) pair is already in cafe_users,
// treat as success. Lets accidental double-submits pass cleanly.

interface RegisterBody {
  code?: string
  email?: string
  name?: string
}

export async function POST(request: Request) {
  let body: RegisterBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Malformed JSON.' }, { status: 400 })
  }

  const code = (body.code ?? '').trim().toUpperCase()
  const email = (body.email ?? '').trim().toLowerCase()

  if (!code || !email) {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'code and email required' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL', message: 'Enter a valid email.' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  const { data: invite } = await sb
    .from('partner_invitations')
    .select('code, cafe_id, email, role, expires_at, used_at')
    .eq('code', code)
    .maybeSingle()

  if (!invite) {
    return NextResponse.json(
      { error: 'UNKNOWN_CODE', message: "We don't recognize that code. Check the code from your invitation email." },
      { status: 404 },
    )
  }
  if (invite.used_at) {
    return NextResponse.json(
      { error: 'CODE_USED', message: 'This code was already used. Contact Strudl support if this is a mistake.' },
      { status: 410 },
    )
  }
  if (invite.expires_at && new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'CODE_EXPIRED', message: 'This code has expired. Contact Strudl support for a new one.' },
      { status: 410 },
    )
  }
  if ((invite.email as string).toLowerCase() !== email) {
    return NextResponse.json(
      { error: 'EMAIL_MISMATCH', message: 'This code was issued to a different email. Enter the email you received the invitation at.' },
      { status: 409 },
    )
  }

  const cafeId = invite.cafe_id as string
  const role = (invite.role as string) ?? 'owner'

  // Look up café name for the success response.
  const { data: cafe } = await sb
    .from('cafes')
    .select('name')
    .eq('id', cafeId)
    .maybeSingle()

  // Idempotent insert: if the pair already exists, that's fine.
  const { data: existing } = await sb
    .from('cafe_users')
    .select('cafe_id')
    .eq('cafe_id', cafeId)
    .eq('email', email)
    .maybeSingle()

  if (!existing) {
    const { error: insertErr } = await sb
      .from('cafe_users')
      .insert({ cafe_id: cafeId, email, role })
    if (insertErr) {
      return NextResponse.json({ error: 'DB_ERROR', message: insertErr.message }, { status: 500 })
    }
  }

  // Atomic mark-used: refuses to redeem twice under a race. We ignore
  // the update result — if someone beat us and cafe_users is already
  // populated, the account is still ready to log in.
  await sb
    .from('partner_invitations')
    .update({ used_at: new Date().toISOString(), used_by_email: email })
    .eq('code', code)
    .is('used_at', null)

  return NextResponse.json({
    ok: true,
    email,
    cafeName: (cafe?.name as string) ?? 'your café',
  })
}
