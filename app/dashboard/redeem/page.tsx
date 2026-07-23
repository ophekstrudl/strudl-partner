'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Barista redeem surface — two entry paths for the same endpoint:
//   type: barista types STRDL-XXXX code
//   scan: camera reads the QR from the customer's Rewards screen
// Both POST the code to /api/redeem, which flips redeemed_at atomically.

type Mode = 'type' | 'scan'
type Phase =
  | 'idle'
  | 'starting'   // scan mode only, camera booting
  | 'scanning'   // scan mode only, camera active
  | 'submitting'
  | 'success'
  | 'error'

interface RedeemSuccess {
  userName: string
  redeemedAt: string
  cafeName: string
}

const READER_ID = 'strudl-redeem-scanner-region'

// Body-only state; STRDL- is a fixed decoration in the input.
function sanitizeBody(raw: string): string {
  const up = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const stripped = up.startsWith('STRDL') ? up.slice(5) : up
  return stripped.slice(0, 4)
}

export default function RedeemPage() {
  const [mode, setMode] = useState<Mode>('type')
  const [phase, setPhase] = useState<Phase>('idle')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<RedeemSuccess | null>(null)
  const [error, setError] = useState<string>('')
  const [cameraMounted, setCameraMounted] = useState(true)
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const submittingRef = useRef(false)

  const canSubmitTyped = /^[A-Z0-9]{4}$/.test(body)

  // Unmount the camera briefly after success/error so the scanner's
  // black square doesn't sit under the result banner.
  useEffect(() => {
    if (phase === 'success' || phase === 'error') {
      const id = setTimeout(() => setCameraMounted(false), 220)
      return () => clearTimeout(id)
    }
    setCameraMounted(true)
  }, [phase])

  // Also tear down the camera when the barista navigates away.
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {}).finally(() => scannerRef.current?.clear())
    }
  }, [])

  async function submitCode(code: string) {
    setPhase('submitting')
    setError('')
    try {
      const r = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const respBody = await r.json().catch(() => ({} as Record<string, unknown>))
      if (!r.ok) {
        setError((respBody as { message?: string }).message ?? `HTTP ${r.status}`)
        setPhase('error')
        return
      }
      setResult(respBody as RedeemSuccess)
      setPhase('success')
    } catch (e) {
      setError((e as Error).message || 'Network error')
      setPhase('error')
    }
  }

  function handleTypeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitTyped) return
    submitCode(`STRDL-${body}`)
  }

  async function startScanning() {
    setError('')
    setResult(null)
    setPhase('starting')
    submittingRef.current = false

    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* already stopped */ }
      try { scannerRef.current.clear() } catch { /* no-op */ }
      scannerRef.current = null
    }
    // Wait a frame so the reader element is in the DOM.
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const { Html5Qrcode } = await import('html5-qrcode')
    const instance = new Html5Qrcode(READER_ID)
    scannerRef.current = instance

    try {
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onDecoded,
        () => {},
      )
      setPhase('scanning')
    } catch (e) {
      setError((e as Error).message || 'Camera unavailable')
      setPhase('error')
    }
  }

  async function onDecoded(text: string) {
    if (submittingRef.current) return
    submittingRef.current = true
    try { await scannerRef.current?.stop() } catch { /* already stopped */ }
    // Accept either raw STRDL-XXXX (from the customer's QR) or just XXXX.
    const cleaned = text.trim().toUpperCase()
    const code = cleaned.startsWith('STRDL-') ? cleaned : `STRDL-${cleaned}`
    submitCode(code)
  }

  function resetForNext() {
    setBody('')
    setResult(null)
    setError('')
    setPhase('idle')
    submittingRef.current = false
  }

  function switchMode(next: Mode) {
    if (next === mode) return
    // Stop any live camera before hiding.
    scannerRef.current?.stop().catch(() => {})
    setMode(next)
    resetForNext()
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      background: '#1A1815',
      color: '#FDFAF5',
      padding: 16,
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em' }}>
            Redeem reward
          </h1>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textDecoration: 'none' }}>
            Dashboard →
          </Link>
        </div>

        {/* Mode toggle — only visible while not showing a result */}
        {phase !== 'success' && phase !== 'submitting' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 999, padding: 4,
            marginBottom: 20,
          }}>
            {(['type', 'scan'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontWeight: 700, fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === m ? '#FDFAF5' : 'transparent',
                  color: mode === m ? '#1A1815' : 'rgba(255,255,255,0.7)',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {m === 'type' ? 'Type code' : '📷 Scan QR'}
              </button>
            ))}
          </div>
        )}

        {/* Type-code form */}
        {mode === 'type' && phase !== 'success' && (
          <form onSubmit={handleTypeSubmit} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 32,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              Type the code from the customer's phone.
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '18px 20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 16,
              fontSize: '1.5rem',
              fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
              fontWeight: 700,
              letterSpacing: '0.15em',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>STRDL-</span>
              <input
                value={body}
                onChange={(e) => setBody(sanitizeBody(e.target.value))}
                autoFocus
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={4}
                placeholder="XXXX"
                size={4}
                style={{
                  width: '4.6em',
                  padding: 0, margin: 0,
                  background: 'transparent',
                  border: 'none',
                  color: '#FDFAF5',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  fontWeight: 'inherit',
                  letterSpacing: 'inherit',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />
            </div>

            {phase === 'error' && (
              <p style={{ marginTop: 14, color: '#f0a0a0', fontSize: '0.9rem', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmitTyped || phase === 'submitting'}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '14px',
                background: canSubmitTyped ? '#E6C828' : 'rgba(230,200,40,0.35)',
                color: '#1A1815',
                border: 'none',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: canSubmitTyped ? 'pointer' : 'not-allowed',
                opacity: phase === 'submitting' ? 0.6 : 1,
                boxShadow: canSubmitTyped ? '0 4px 14px rgba(230,200,40,0.35)' : 'none',
              }}
            >
              {phase === 'submitting' ? 'Checking…' : 'Redeem'}
            </button>
          </form>
        )}

        {/* Scan-QR form */}
        {mode === 'scan' && phase !== 'success' && (
          <>
            {cameraMounted && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                marginBottom: 20,
              }}
            >
              <div id={READER_ID} style={{ width: '100%', height: '100%' }} />

              {(phase === 'idle' || phase === 'starting') && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
                  background: 'rgba(26,24,21,0.9)',
                }}>
                  <div style={{ fontSize: '2.5rem' }}>📷</div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: 240, textAlign: 'center', lineHeight: 1.5 }}>
                    Tap start, then aim your camera at the reward QR from the customer's app.
                  </p>
                  <button
                    onClick={startScanning}
                    disabled={phase === 'starting'}
                    style={{
                      marginTop: 4, padding: '12px 24px',
                      background: '#E6C828', color: '#1A1815',
                      border: 'none', borderRadius: 999,
                      fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                      opacity: phase === 'starting' ? 0.6 : 1,
                    }}
                  >
                    {phase === 'starting' ? 'Starting…' : 'Start camera'}
                  </button>
                </div>
              )}
            </div>
            )}

            {phase === 'scanning' && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Point camera at the reward QR…
              </p>
            )}

            {phase === 'submitting' && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                Checking…
              </p>
            )}

            {phase === 'error' && (
              <div style={{
                background: 'rgba(192,57,43,0.14)',
                border: '1px solid rgba(192,57,43,0.4)',
                borderRadius: 20,
                padding: 20,
                textAlign: 'center',
                marginTop: cameraMounted ? 0 : 20,
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>😕</div>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', marginBottom: 12 }}>
                  {error}
                </p>
                <button
                  onClick={startScanning}
                  style={{
                    padding: '12px 24px',
                    background: '#FDFAF5', color: '#1A1815',
                    border: 'none', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}

        {phase === 'success' && result && (
          <div style={{
            background: 'rgba(230,200,40,0.12)',
            border: '1px solid rgba(230,200,40,0.4)',
            borderRadius: 24,
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
            <p style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 6 }}>
              Free coffee redeemed
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: 20 }}>
              for {result.userName}
            </p>
            <button
              onClick={resetForNext}
              style={{
                padding: '12px 24px',
                background: '#FDFAF5', color: '#1A1815',
                border: 'none', borderRadius: 999,
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              }}
            >
              Redeem another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
