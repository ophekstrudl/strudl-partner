import { supabaseServer } from './supabase/server'
import { supabaseAdmin } from './supabase/admin'

// Barista identity resolver. Returns the caller's café if:
//   1. They have a valid Supabase session (magic-link authed)
//   2. Their email is in public.cafe_users
//
// Any endpoint that credits stamps or redeems rewards must go through
// this — cafeId is never trusted from the client. Called by server
// components (for gating UI) and by route handlers (for gating writes).

export interface BaristaContext {
  email: string
  cafeId: string
  cafeName: string
  role: string
}

export async function getBaristaCafe(): Promise<BaristaContext | null> {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user?.email) return null

  const email = user.email.toLowerCase()
  const admin = supabaseAdmin()
  const { data: link } = await admin
    .from('cafe_users')
    .select('cafe_id, role')
    .eq('email', email)
    .maybeSingle()

  if (!link) return null

  const { data: cafe } = await admin
    .from('cafes')
    .select('name')
    .eq('id', link.cafe_id)
    .maybeSingle()

  return {
    email,
    cafeId: link.cafe_id as string,
    cafeName: (cafe?.name as string) ?? 'Unknown café',
    role: link.role as string,
  }
}
