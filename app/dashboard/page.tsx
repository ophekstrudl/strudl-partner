'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { periodData, hourlyData, customers, invoices, audienceData, Period } from '@/lib/mockData'
import { generateTodayStats } from '@/lib/helpers'
import Overview  from './components/Overview'
import Analytics from './components/Analytics'
import Audience  from './components/Audience'
import Billing   from './components/Billing'
import Settings  from './components/Settings'

type Tab = 'overview' | 'analytics' | 'insights' | 'billing' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'analytics', label: 'Analytics' },
  { id: 'insights',  label: 'Insights'  },
  { id: 'billing',   label: 'Billing'   },
  { id: 'settings',  label: 'Settings'  },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d',  label: '7 days'    },
  { id: '30d', label: '30 days'   },
  { id: '12m', label: '12 months' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady]   = useState(false)
  const [tab, setTab]       = useState<Tab>('overview')
  const [period, setPeriod] = useState<Period>('30d')
  const [tick, setTick]     = useState(0)
  const [lastRefresh, setLastRefresh] = useState('just now')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Middleware bounces unauthed users to /dashboard/login before we
    // even mount. We're just checking cafe_users linkage here.
    fetch('/api/me')
      .then((r) => {
        if (r.status === 403) {
          router.replace('/dashboard/unauthorized')
          return
        }
        if (!r.ok) {
          router.replace('/dashboard/login')
          return
        }
        setReady(true)
        const stored = localStorage.getItem('db_darkMode')
        if (stored === 'true') setDarkMode(true)
      })
      .catch(() => router.replace('/dashboard/login'))
  }, [router])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('db_darkMode', String(darkMode))
  }, [darkMode])

  async function logout() {
    const { supabaseBrowser } = await import('@/lib/supabase/browser')
    await supabaseBrowser().auth.signOut()
    router.push('/dashboard/login')
  }

  function simulateRefresh() {
    setTick(t => t + 1)
    const now = new Date()
    setLastRefresh(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
  }

  const todayStats    = useMemo(() => generateTodayStats(tick), [tick])
  const data          = periodData[period]
  const monthlyBilled = invoices[0].amount
  const audience      = audienceData[period]

  if (!ready) return null

  // Show period switcher on tabs where data changes with period
  const showPeriod = tab === 'overview' || tab === 'analytics' || tab === 'insights'

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
              Last updated: {lastRefresh} · The Corner Brew
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
              onClick={simulateRefresh}
              style={{
                padding: '10px 18px', background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--line)', borderRadius: 999, fontWeight: 600,
                fontSize: '0.88rem', cursor: 'pointer',
              }}
            >
              ↻ Simulate refresh
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

        {/* Tab content */}
        {tab === 'overview'  && <Overview  period={period} data={data} todayStats={todayStats} customers={customers} monthlyBilled={monthlyBilled} onTabChange={t => setTab(t as Tab)} />}
        {tab === 'analytics' && <Analytics period={period} data={data} hourlyData={hourlyData} todayStats={todayStats} customers={customers} />}
        {tab === 'insights'  && <Audience  period={period} data={audience} />}
        {tab === 'billing'   && <Billing   invoices={invoices} />}
        {tab === 'settings'  && <Settings darkMode={darkMode} onDarkModeChange={setDarkMode} />}

      </div>
    </div>
  )
}
