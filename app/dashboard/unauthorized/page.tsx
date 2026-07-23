import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBaristaCafe } from '@/lib/auth'

const P = {
  bg: '#EDE8DF',
  shell: '#FDFAF5',
  border: '#E8E2D8',
  text: '#1A1815',
  muted: '#7A7060',
}

// Shown when a user is signed in but isn't in public.cafe_users — i.e.
// they got a magic link but their email isn't linked to a café. If the
// email IS linked (e.g. they just got added), bounce them to /dashboard.

export default async function UnauthorizedPage() {
  const barista = await getBaristaCafe()
  if (barista) redirect('/dashboard')

  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()

  async function signOut() {
    'use server'
    const sb = supabaseServer()
    await sb.auth.signOut()
    redirect('/dashboard/login')
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      background: P.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: P.shell, border: `1px solid ${P.border}`, borderRadius: 24,
        padding: 36, boxShadow: '0 20px 60px rgba(26,24,21,0.10)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', marginBottom: 10, color: P.text }}>
          Not a partner yet
        </h1>
        <p style={{ color: P.muted, fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 8 }}>
          {user?.email ? (
            <>
              <strong style={{ color: P.text }}>{user.email}</strong> isn't linked to a Strudl café.
            </>
          ) : (
            <>You need to sign in first.</>
          )}
        </p>
        {user?.email && (
          <p style={{ color: P.muted, fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 20 }}>
            <a
              href={`mailto:partners@strudl.app?subject=${encodeURIComponent('Café partner access request')}&body=${encodeURIComponent(`Hi Strudl team,\n\nI'd like to link ${user.email} to a Strudl café so I can access the partner dashboard.\n\nCafé name:\nLocation:\n\nThanks!`)}`}
              style={{ color: P.text, textDecoration: 'underline' }}
            >
              Contact Strudl support
            </a>{' '}
            to get added, or sign in with a different email.
          </p>
        )}
        <form action={signOut}>
          <button type="submit" style={{
            padding: '12px 24px',
            background: P.text, color: P.shell,
            border: `1px solid ${P.text}`, borderRadius: 999,
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>
            Sign out
          </button>
        </form>
        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{ color: P.muted, fontSize: '0.88rem' }}>← Back to website</Link>
        </div>
      </div>
    </div>
  )
}
