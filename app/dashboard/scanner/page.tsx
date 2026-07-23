'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Barista scanner. Opens the phone camera, decodes the customer's
// rotating QR (a signed JWT), POSTs to /api/stamp. Shows outcome then
// waits for the barista to tap "Scan another".
//
// Camera access requires HTTPS or localhost — on any other host the
// browser will refuse `getUserMedia`. Cloudflared tunnels are HTTPS,
// so they work too.

type Phase = 'idle' | 'starting' | 'scanning' | 'submitting' | 'success' | 'error'

// The redeem action is gated behind a two-tap confirm to prevent an
// accidental tap from immediately burning a customer's reward.
type RedeemPhase = 'idle' | 'confirm' | 'submitting' | 'redeemed' | 'failed'
const REDEEM_CONFIRM_WINDOW_MS = 5000

interface StampSuccess {
  userName: string
  currentStamps: number
  rewardUnlocked: { code: string } | null
}

const READER_ID = 'strudl-scanner-region'

export default function ScannerPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<StampSuccess | null>(null)
  const [error, setError] = useState<string>('')
  const [cameraMounted, setCameraMounted] = useState(true)
  const [redeemPhase, setRedeemPhase] = useState<RedeemPhase>('idle')
  const [redeemError, setRedeemError] = useState<string>('')
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const submittingRef = useRef(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fully unmount the camera 220ms after the fade-out begins so it
  // doesn't keep a black square between the header and the result banner.
  useEffect(() => {
    if (phase === 'success' || phase === 'error') {
      const id = setTimeout(() => setCameraMounted(false), 220)
      return () => clearTimeout(id)
    }
    setCameraMounted(true)
  }, [phase])

  useEffect(() => {
    return () => {
      // Ensure the camera track is released if the barista navigates away.
      scannerRef.current?.stop().catch(() => {}).finally(() => scannerRef.current?.clear())
    }
  }, [])

  function beginRedeemConfirm() {
    setRedeemError('')
    setRedeemPhase('confirm')
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => {
      setRedeemPhase('idle')
    }, REDEEM_CONFIRM_WINDOW_MS)
  }

  function cancelRedeemConfirm() {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setRedeemPhase('idle')
  }

  async function doRedeem() {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    if (!result?.rewardUnlocked) return
    setRedeemPhase('submitting')
    setRedeemError('')
    try {
      const r = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: result.rewardUnlocked.code }),
      })
      const body = await r.json().catch(() => ({} as Record<string, unknown>))
      if (!r.ok) {
        setRedeemError((body as { message?: string }).message ?? `HTTP ${r.status}`)
        setRedeemPhase('failed')
        return
      }
      setRedeemPhase('redeemed')
    } catch (e) {
      setRedeemError((e as Error).message || 'Network error')
      setRedeemPhase('failed')
    }
  }

  async function startScanning() {
    setError('')
    setResult(null)
    setRedeemPhase('idle')
    setRedeemError('')
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setPhase('starting')
    submittingRef.current = false

    // Dispose any stale scanner from a prior attempt — otherwise a new
    // Html5Qrcode on the same DOM id collides with leftover <video>
    // elements and .start() silently hangs.
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* already stopped */ }
      try { scannerRef.current.clear() } catch { /* no-op */ }
      scannerRef.current = null
    }

    // Wait one frame so React flushes the re-mount of the #READER_ID
    // element (which was unmounted during the fade-out). Without this,
    // new Html5Qrcode() references a DOM node that doesn't exist yet.
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const { Html5Qrcode } = await import('html5-qrcode')
    const instance = new Html5Qrcode(READER_ID)
    scannerRef.current = instance

    try {
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        onDecoded,
        () => {}, // per-frame "no QR yet" — noisy, ignore
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

    // Stop the camera immediately — prevents duplicate submissions of the
    // same QR while the network request is in flight.
    try {
      await scannerRef.current?.stop()
    } catch { /* already stopped */ }

    setPhase('submitting')
    try {
      const r = await fetch('/api/stamp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stampToken: text }),
      })
      const body = await r.json().catch(() => ({} as Record<string, unknown>))
      if (!r.ok) {
        setError((body as { message?: string }).message ?? `HTTP ${r.status}`)
        setPhase('error')
        return
      }
      setResult(body as StampSuccess)
      setPhase('success')
    } catch (e) {
      setError((e as Error).message || 'Network error')
      setPhase('error')
    }
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
            Scan customer
          </h1>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textDecoration: 'none' }}>
            Dashboard →
          </Link>
        </div>

        {/* Camera viewfinder — fades out over 220ms then unmounts.
            The unmount is triggered by the effect above via cameraMounted.
            Remounts fresh when the barista taps "Scan another". */}
        {cameraMounted && (
        <div
          className={phase === 'success' || phase === 'error' ? 'strudl-fade-out' : undefined}
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
        }}>
          <div id={READER_ID} style={{ width: '100%', height: '100%' }} />

          {(phase === 'idle' || phase === 'starting') && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
              background: 'rgba(26,24,21,0.9)',
            }}>
              <div style={{ fontSize: '2.5rem' }}>📷</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: 240, textAlign: 'center', lineHeight: 1.5 }}>
                Tap start, then aim your camera at the customer's Strudl QR.
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

        {/* Result panel */}
        {phase === 'scanning' && (
          <p style={{ marginTop: 16, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Point camera at the customer's QR…
          </p>
        )}

        {phase === 'submitting' && (
          <p style={{ marginTop: 16, textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
            Adding stamp…
          </p>
        )}

        {phase === 'success' && result && (
          <div className="strudl-reveal" style={{
            background: 'rgba(230,200,40,0.12)',
            border: '1px solid rgba(230,200,40,0.4)',
            borderRadius: 20,
            padding: 20,
            textAlign: 'center',
          }}>
            {result.rewardUnlocked ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                <p style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 4 }}>
                  Free coffee unlocked for {result.userName}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {result.rewardUnlocked.code}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>☕</div>
                <p style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 4 }}>
                  Stamp added for {result.userName}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  {result.currentStamps} / 9 toward next free coffee
                </p>
              </>
            )}

            {/* Reward-unlock: two-tap redeem or defer to customer app */}
            {result.rewardUnlocked && redeemPhase === 'idle' && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={beginRedeemConfirm}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent', color: '#E6C828',
                    border: '1px solid rgba(230,200,40,0.5)', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >
                  🎁 Redeem free coffee now
                </button>
                <button
                  onClick={startScanning}
                  style={{
                    padding: '12px 24px',
                    background: '#FDFAF5', color: '#1A1815',
                    border: 'none', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >
                  Scan another
                </button>
              </div>
            )}

            {result.rewardUnlocked && redeemPhase === 'confirm' && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginBottom: 4 }}>
                  Tap once more to redeem. Auto-cancels in 5s.
                </p>
                <button
                  onClick={doRedeem}
                  style={{
                    padding: '14px 24px',
                    background: '#E6C828', color: '#1A1815',
                    border: '1px solid #E6C828', borderRadius: 999,
                    fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(230,200,40,0.45)',
                  }}
                >
                  ✓ Confirm redemption
                </button>
                <button
                  onClick={cancelRedeemConfirm}
                  style={{
                    padding: '10px 24px',
                    background: 'transparent', color: 'rgba(255,255,255,0.7)',
                    border: 'none',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {result.rewardUnlocked && redeemPhase === 'submitting' && (
              <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>
                Redeeming…
              </p>
            )}

            {result.rewardUnlocked && redeemPhase === 'redeemed' && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: '#E6C828', marginBottom: 12 }}>
                  ✅ Free coffee delivered
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
                  Scan another
                </button>
              </div>
            )}

            {result.rewardUnlocked && redeemPhase === 'failed' && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ color: '#f0a0a0', fontSize: '0.9rem' }}>
                  Redeem failed: {redeemError}
                </p>
                <button
                  onClick={beginRedeemConfirm}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent', color: '#E6C828',
                    border: '1px solid rgba(230,200,40,0.5)', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
                <button
                  onClick={startScanning}
                  style={{
                    padding: '12px 24px',
                    background: '#FDFAF5', color: '#1A1815',
                    border: 'none', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >
                  Scan another
                </button>
              </div>
            )}

            {/* Non-reward path — just the "Scan another" button as before */}
            {!result.rewardUnlocked && (
              <button
                onClick={startScanning}
                style={{
                  marginTop: 16, padding: '12px 24px',
                  background: '#FDFAF5', color: '#1A1815',
                  border: 'none', borderRadius: 999,
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                Scan another
              </button>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div className="strudl-reveal" style={{
            background: 'rgba(192,57,43,0.14)',
            border: '1px solid rgba(192,57,43,0.4)',
            borderRadius: 20,
            padding: 20,
            textAlign: 'center',
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
      </div>
    </div>
  )
}
