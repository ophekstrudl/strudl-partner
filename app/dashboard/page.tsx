'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AnalyticsResponse, Period } from '@/lib/analytics-types'
import Overview  from './components/Overview'
import Analytics from './components/Analytics'
import Audience  from './components/Audience'
import Customers from './components/Customers'
import Settings  from './components/Settings'

type Tab = 'overview' | 'analytics' | 'customers' | 'billing' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'analytics', label: 'Analytics' },
  { id: 'customers', label: 'Customers' },
  { id: 'billing',   label: 'Billing'   },
  { id: 'settings',  label: 'Settings'  },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d',  label: '7 days'    },
  { id: '30d', label: '30 days'   },
  { id: '12m', label: '12 months' },
]

interface Me {
  email: string
  cafeId: string
  cafeName: string
  role: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState<Period>('30d')
  const [darkMode, setDarkMode] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [analyticsErr, setAnalyticsErr] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState('just now')

  // ── Auth gate + café identity ────────────────────────────────────
  useEffect(() => {
    fetch('/api/me')
      .then(async (r) => {
        if (r.status === 403) { router.replace('/dashboard/unauthorized'); return }
        if (!r.ok) { router.replace('/dashboard/login'); return }
        const body = (await r.json()) as Me
        setMe(body)
        setReady(true)
        const stored = localStorage.getItem('db_darkMode')
        if (stored === 'true') setDarkMode(true)
      })
      .catch(() => router.replace('/dashboard/login'))
  }, [router])

  // ── Analytics fetch on period change (and on demand) ─────────────
  const fetchAnalytics = useCallback(async (forRefresh = false) => {
    if (forRefresh) setRefreshing(true)
    setAnalyticsErr(null)
    try {
      const r = await fetch(`/api/analytics?period=${period}`)
      if (!r.ok) {
        const body = await r.json().catch(() => ({} as Record<string, unknown>))
        setAnalyticsErr((body as { message?: string }).message ?? `HTTP ${r.status}`)
        return
      }
      const body = (await r.json()) as AnalyticsResponse
      setAnalytics(body)
      if (forRefresh) {
        const now = new Date()
        setLastRefresh(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
      }
    } catch (e) {
      setAnalyticsErr((e as Error).message)
    } finally {
      if (forRefresh) setRefreshing(false)
    }
  }, [period])

  useEffect(() => {
    if (!ready) return
    fetchAnalytics(false)
  }, [ready, fetchAnalytics])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('db_darkMode', String(darkMode))
  }, [darkMode])

  async function logout() {
    const { supabaseBrowser } = await import('@/lib/supabase/browser')
    await supabaseBrowser().auth.signOut()
    router.push('/dashboard/login')
  }

  if (!ready) return null

  const showPeriod = tab === 'overview' || tab === 'analytics'

  // Empty state — new café or hasn't earned any stamps yet.
  const hasNoData =
    analytics &&
    analytics.periodData.every((d) => d.stamps === 0) &&
    analytics.todayStats.stampsToday === 0 &&
    analytics.customers.length === 0

  return (
    <div style={{ background: 'var(--surface)', minHeight: 'calc(100vh - 72px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 16px 64px' }}>

        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16, marginBottom: 28,
        }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', letterSpacing: '-0.04em', marginBottom: 4 }}>
              Business Dashboard
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
              Last updated: {lastRefresh} · {me?.cafeName ?? '—'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/dashboard/scanner')}
              style={{
                padding: '10px 18px', background: '#E6C828', color: '#1A1815',
                border: '1px solid #E6C828', borderRadius: 999, fontWeight: 700,
                fontSize: '0.88rem', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(230,200,40,0.35)',
              }}
            >
              ☕ Scan customer
            </button>
            <button
              onClick={() => router.push('/dashboard/redeem')}
              style={{
                padding: '10px 18px', background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid #E6C828', borderRadius: 999, fontWeight: 700,
                fontSize: '0.88rem', cursor: 'pointer',
              }}
            >
              🎟 Redeem
            </button>
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              style={{
                padding: '10px 18px', background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--line)', borderRadius: 999, fontWeight: 600,
                fontSize: '0.88rem', cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
            </button>
            <button
              onClick={logout}
              style={{
                padding: '10px 18px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--line)', borderRadius: 999, fontWeight: 600,
                fontSize: '0.88rem', cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab bar + period switcher */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 28,
        }}>
          <div style={{
            display: 'flex', background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 999, padding: 4, gap: 2,
          }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 18px', borderRadius: 999, fontWeight: 600,
                  fontSize: '0.88rem', border: 'none', cursor: 'pointer',
                  background: tab === t.id ? '#0f0f0f' : 'transparent',
                  color: tab === t.id ? '#fff' : 'var(--muted)',
                  transition: 'all 160ms',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {showPeriod && (
            <div style={{
              display: 'flex', background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 999, padding: 4, gap: 2,
            }}>
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontWeight: 600,
                    fontSize: '0.82rem', border: 'none', cursor: 'pointer',
                    background: period === p.id ? '#0f0f0f' : 'transparent',
                    color: period === p.id ? '#fff' : 'var(--muted)',
                    transition: 'all 160ms',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error / loading / content */}
        {analyticsErr && (
          <div style={{
            background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.3)',
            borderRadius: 20, padding: 20, marginBottom: 20, color: '#c0392b', fontSize: '0.95rem',
          }}>
            Couldn't load analytics: {analyticsErr}
          </div>
        )}

        {!analytics && !analyticsErr && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            Loading…
          </div>
        )}

        {analytics && hasNoData && (
          <EmptyState cafeName={me?.cafeName ?? 'your café'} />
        )}

        {analytics && !hasNoData && tab === 'overview' && (
          <Overview
            period={period}
            data={analytics.periodData}
            todayStats={analytics.todayStats}
            customers={analytics.customers}
            monthlyBilled={analytics.periodData.reduce((s, d) => s + d.revenue, 0)}
            onTabChange={(t) => setTab(t as Tab)}
          />
        )}
        {analytics && !hasNoData && tab === 'analytics' && (
          <Analytics
            period={period}
            data={analytics.periodData}
            hourlyData={analytics.hourlyData}
            todayStats={analytics.todayStats}
            customers={analytics.customers}
          />
        )}
        {analytics && !hasNoData && tab === 'customers' && (
          <Customers customers={analytics.customers} />
        )}
        {tab === 'billing' && <BillingPlaceholder />}
        {tab === 'settings' && <Settings darkMode={darkMode} onDarkModeChange={setDarkMode} />}

      </div>
    </div>
  )
}

// Empty state — shown when the café has zero stamps in the window.
// Points the owner at the scanner so they can start seeing data.
function EmptyState({ cafeName }: { cafeName: string }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--line)',
      borderRadius: 24, padding: 48, textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>☕</div>
      <h2 style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em', marginBottom: 8 }}>
        No activity yet
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Once customers start stamping at <strong style={{ color: 'var(--text)' }}>{cafeName}</strong>,
        analytics show up here — stamps by day, peak hours, top regulars, and more.
      </p>
    </div>
  )
}

// Billing tab placeholder — the real billing engine isn't built yet.
// Replace when we ship it. Same visual shell as other tab cards.
function BillingPlaceholder() {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--line)',
      borderRadius: 24, padding: 48, textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🧾</div>
      <h2 style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em', marginBottom: 8 }}>
        Billing arrives with your first invoice
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
        Strudl is free while we onboard our first partners. Once billing goes live, you'll see monthly
        invoices, projected usage, and payment history here.
      </p>
    </div>
  )
}
