'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

const P = {
  bg: '#EDE8DF',
  shell: '#FDFAF5',
  surface: '#F0EBE0',
  border: '#E8E2D8',
  text: '#1A1815',
  muted: '#7A7060',
  amber: '#E6C828',
  cta: '#1A1815',
}

const features = [
  { icon: '📱', title: 'No hardware needed', desc: 'Works on any smartphone. Guests show their code, you scan it — no terminals, no subscriptions, no hassle.' },
  { icon: '📊', title: 'Real-time analytics', desc: 'Visit frequency, regulars, peak hours — at a glance. Make decisions based on real data, not gut feeling.' },
  { icon: '☕', title: 'Real regulars', desc: 'Replace paper stamp cards with a digital experience. Guests come back more often — and bring friends.' },
]

const services = [
  {
    icon: '🎫',
    title: 'Digital Stamp Cards',
    desc: 'Replace paper with beautiful digital loyalty cards. Guests show their app, you scan to stamp — no app download required for the barista.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    desc: 'Real-time insights on visits, spend patterns, and redemption rates. Understand your regulars and spot growth opportunities.',
  },
  {
    icon: '📣',
    title: 'Campaign Manager',
    desc: 'Targeted promotions for your most loyal guests. Double-stamp Tuesdays, birthday offers, flash deals — set up in under 2 minutes.',
  },
]

const contactInfo = [
  { icon: '✉️', label: 'Email', value: 'partners@strudl.app' },
  { icon: '📍', label: 'Location', value: 'Vienna, Austria' },
  { icon: '🕐', label: 'Hours', value: 'Mon–Fri, 9am–6pm' },
]

export default function HomePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [cafeName, setCafeName] = useState('')
  const [loading, setLoading] = useState(false)
  const [regError, setRegError] = useState('')

  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !code.trim()) return
    setRegError('')
    setLoading(true)
    try {
      const r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), email: email.trim(), name: name.trim() }),
      })
      const body = await r.json().catch(() => ({} as Record<string, unknown>))
      if (!r.ok) {
        setRegError((body as { message?: string }).message ?? `HTTP ${r.status}`)
        return
      }
      // Registration succeeded — now fire the magic link so they can sign in.
      // Reuses the existing branded template. sign-in lands at /dashboard.
      const supabase = supabaseBrowser()
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/dashboard/auth/callback` },
      })
      if (otpErr) {
        setRegError(`Registered, but email failed: ${otpErr.message}`)
        return
      }
      setCafeName((body as { cafeName?: string }).cafeName ?? 'your café')
      setSubmitted(true)
    } catch (err) {
      setRegError((err as Error).message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function setField(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleContact(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setTimeout(() => { setSending(false); setSent(true) }, 800)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: `1px solid ${P.border}`,
    borderRadius: 12, fontSize: '0.97rem', outline: 'none',
    background: P.shell, color: P.text,
    transition: 'border-color 180ms',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ background: P.bg }}>

      {/* ── HOME ─────────────────────────────────────────────────── */}
      <section id="home" style={{ padding: '80px 16px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: `1px solid ${P.border}`, borderRadius: 999, padding: '8px 14px',
            background: P.shell, fontSize: '0.9rem', color: P.muted, marginBottom: 24,
          }}>
            ☕ Partner Portal
          </span>
          <h1 style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', lineHeight: 0.95,
            letterSpacing: '-0.055em', marginBottom: 20, fontWeight: 800, color: P.text,
          }}>
            One card.<br />Every café.
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: P.muted,
            maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6,
          }}>
            Independent cafés don&apos;t need loyalty cards. They need regulars.
            Strudl gives you the tools the chains have had for years.
          </p>

          {/* Registration card */}
          <div style={{
            maxWidth: 440, margin: '0 auto',
            background: P.shell, border: `1px solid ${P.border}`, borderRadius: 24,
            padding: 32, boxShadow: '0 20px 60px rgba(26,24,21,0.10)',
            textAlign: 'left',
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>☕</div>
                <h2 style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em', marginBottom: 8, color: P.text }}>
                  Welcome to Strudl.
                </h2>
                <p style={{ color: P.muted, fontSize: '0.97rem', marginBottom: 6 }}>
                  <strong style={{ color: P.text }}>{cafeName}</strong> is registered.
                </p>
                <p style={{ color: P.muted, fontSize: '0.92rem' }}>
                  Check <strong style={{ color: P.text }}>{email}</strong> for your sign-in link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister}>
                <h2 style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em', marginBottom: 6, color: P.text }}>
                  Register your café
                </h2>
                <p style={{ color: P.muted, fontSize: '0.9rem', marginBottom: 24 }}>Takes less than a minute.</p>

                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6, color: P.text }}>
                  Your name
                </label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required style={{ ...inputStyle, marginBottom: 16 }}
                  onFocus={e => e.target.style.borderColor = P.text}
                  onBlur={e => e.target.style.borderColor = P.border}
                />

                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6, color: P.text }}>
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourcafé.com"
                  required style={{ ...inputStyle, marginBottom: 4 }}
                  onFocus={e => e.target.style.borderColor = P.text}
                  onBlur={e => e.target.style.borderColor = P.border}
                />
                <p style={{ color: P.muted, fontSize: '0.82rem', marginBottom: 16 }}>
                  Use the email your invitation was sent to.
                </p>

                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6, color: P.text }}>
                  Partner code
                </label>
                <input
                  value={code} onChange={e => setCode(e.target.value)}
                  placeholder="e.g. CAFE-2024"
                  required style={{ ...inputStyle, marginBottom: 4 }}
                  onFocus={e => e.target.style.borderColor = P.text}
                  onBlur={e => e.target.style.borderColor = P.border}
                />
                <p style={{ color: P.muted, fontSize: '0.82rem', marginBottom: regError ? 16 : 24 }}>
                  You received this code in your invitation email.
                </p>

                {regError && (
                  <p style={{ color: '#c0392b', fontSize: '0.87rem', marginBottom: 16 }}>
                    {regError}
                  </p>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '14px', background: P.cta, color: P.shell,
                    border: `1px solid ${P.cta}`, borderRadius: 999,
                    fontWeight: 700, fontSize: '0.97rem',
                    transition: 'transform 180ms ease, opacity 180ms',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Registering…' : 'Get started →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section style={{ padding: '72px 16px', background: P.surface }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.04em',
            marginBottom: 48, color: P.text,
          }}>
            Everything your café needs.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: P.shell, border: `1px solid ${P.border}`, borderRadius: 24,
                padding: 28, boxShadow: '0 20px 60px rgba(26,24,21,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: '2rem', lineHeight: 1 }}>{f.icon}</span>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', margin: 0, color: P.text }}>{f.title}</h3>
                </div>
                <p style={{ color: P.muted, fontSize: '0.94rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <section id="services" style={{ padding: '80px 16px', background: P.bg }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${P.border}`, borderRadius: 999, padding: '8px 14px',
              background: P.shell, fontSize: '0.9rem', color: P.muted, marginBottom: 20,
            }}>
              ✦ What we offer
            </span>
            <h2 style={{
              fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.6rem)',
              lineHeight: 0.95, letterSpacing: '-0.05em', color: P.text,
            }}>
              Built for<br />independent cafés
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {services.map(s => (
              <div key={s.title} style={{
                background: P.shell, border: `1px solid ${P.border}`, borderRadius: 24,
                padding: 32, boxShadow: '0 20px 60px rgba(26,24,21,0.06)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>{s.icon}</span>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0, color: P.text }}>{s.title}</h3>
                </div>
                <p style={{ color: P.muted, fontSize: '0.95rem', lineHeight: 1.65, flex: 1 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: '80px 16px', background: P.surface }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${P.border}`, borderRadius: 999, padding: '8px 14px',
              background: P.shell, fontSize: '0.9rem', color: P.muted, marginBottom: 20,
            }}>
              ✦ Get in touch
            </span>
            <h2 style={{
              fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.6rem)',
              lineHeight: 0.95, letterSpacing: '-0.05em', color: P.text,
            }}>
              We&apos;d love to<br />hear from you
            </h2>
          </div>

          <div style={{
            maxWidth: 900, margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32,
          }}>
            {/* Info */}
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', marginBottom: 24, color: P.text }}>
                Contact information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {contactInfo.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 12, background: P.shell,
                      border: `1px solid ${P.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0,
                    }}>{c.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: P.muted, marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontWeight: 500, fontSize: '0.97rem', color: P.text }}>{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div style={{
              background: P.shell, border: `1px solid ${P.border}`, borderRadius: 24,
              padding: 32, boxShadow: '0 20px 60px rgba(26,24,21,0.07)',
            }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>✅</div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', marginBottom: 8, color: P.text }}>
                    Message sent!
                  </h3>
                  <p style={{ color: P.muted, fontSize: '0.95rem' }}>We&apos;ll get back to you within one business day.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', marginBottom: 4, color: P.text }}>
                    Send a message
                  </h3>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, color: P.text }}>Name</label>
                    <input value={form.name} onChange={setField('name')} placeholder="Your name" required style={inputStyle}
                      onFocus={e => e.target.style.borderColor = P.text}
                      onBlur={e => e.target.style.borderColor = P.border} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, color: P.text }}>Email</label>
                    <input value={form.email} onChange={setField('email')} type="email" placeholder="you@example.com" required style={inputStyle}
                      onFocus={e => e.target.style.borderColor = P.text}
                      onBlur={e => e.target.style.borderColor = P.border} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, color: P.text }}>Message</label>
                    <textarea value={form.message} onChange={setField('message')} placeholder="How can we help?" required rows={5}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={e => e.target.style.borderColor = P.text}
                      onBlur={e => e.target.style.borderColor = P.border} />
                  </div>
                  <button type="submit" disabled={sending} style={{
                    padding: '14px', background: P.cta, color: P.shell,
                    border: `1px solid ${P.cta}`, borderRadius: 999,
                    fontWeight: 700, fontSize: '0.97rem',
                    opacity: sending ? 0.7 : 1,
                  }}>
                    {sending ? 'Sending…' : 'Send message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────── */}
      <section style={{ padding: '56px 16px', textAlign: 'center', background: P.bg }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: P.text, marginBottom: 24 }}>
            Vienna runs on coffee. Make it run on yours.
          </p>
          <a href="#home" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: P.cta, color: P.shell,
              padding: '14px 28px', borderRadius: 999,
              fontWeight: 700, fontSize: '1rem',
              textDecoration: 'none',
            }}>
            Get started →
          </a>
        </div>
      </section>
    </div>
  )
}
