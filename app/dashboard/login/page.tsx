'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/browser'

// useSearchParams() forces a client-side render — Next 14's default
// static build refuses to prerender this page without either a Suspense
// wrapper or an explicit dynamic opt-out. A login form is inherently
// dynamic anyway (auth state, error hints), so opt out.
export const dynamic = 'force-dynamic'

const P = {
  bg: '#EDE8DF',
  shell: '#FDFAF5',
  border: '#E8E2D8',
  text: '#1A1815',
  muted: '#7A7060',
}

// Magic-link login. No password — the email lands in the barista's inbox
// and takes them to /dashboard/auth/callback which sets the cookie.
// cafe_users allowlist is checked after auth (see lib/auth.ts).

export default function DashboardLoginPage() {
  const params = useSearchParams()
  const errorFlag = params.get('error')
  const initialError =
    errorFlag === 'expired'
      ? "That link is no longer valid — usually because a newer one was sent. Request a fresh link below."
      : errorFlag === 'auth'
        ? 'Sign-in failed. Try requesting a new link.'
        : ''

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(initialError)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Bitte E-Mail eingeben.')
      return
    }
    setError('')
    setLoading(true)
    const supabase = supabaseBrowser()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/auth/callback`,
      },
    })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    setSent(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: `1px solid ${P.border}`,
    borderRadius: 12, fontSize: '0.97rem', outline: 'none',
    background: P.bg, color: P.text,
    transition: 'border-color 180ms', fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      background: P.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: P.shell, border: `1px solid ${P.border}`, borderRadius: 24,
        padding: 36, boxShadow: '0 20px 60px rgba(26,24,21,0.10)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>☕</div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', marginBottom: 6, color: P.text }}>
            Dashboard
          </h1>
          <p style={{ color: P.muted, fontSize: '0.9rem' }}>
            {sent ? 'Check your inbox for the login link.' : 'Sign in to see your analytics'}
          </p>
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, color: P.text }}>
                Email
              </label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="you@cafe.com" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = P.text}
                onBlur={e => e.target.style.borderColor = P.border} />
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: '0.87rem' }}>{error}</p>}

            <button type="submit" disabled={loading} style={{
              marginTop: 6, padding: '14px',
              background: P.text, color: P.shell,
              border: `1px solid ${P.text}`, borderRadius: 999,
              fontWeight: 700, fontSize: '0.97rem', opacity: loading ? 0.7 : 1,
              transition: 'opacity 180ms',
            }}>
              {loading ? 'Sending link…' : 'Send login link →'}
            </button>
          </form>
        )}

        {sent && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ color: P.text, fontSize: '0.95rem', marginBottom: 6 }}>
              We sent a link to <strong>{email}</strong>.
            </p>
            <p style={{ color: P.muted, fontSize: '0.85rem' }}>
              Click it to sign in. You can close this tab.
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/" style={{ color: P.muted, fontSize: '0.88rem' }}>← Back to website</Link>
        </div>
      </div>
    </div>
  )
}
