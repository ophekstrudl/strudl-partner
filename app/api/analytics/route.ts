import { NextResponse } from 'next/server'
import { getBaristaCafe } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Café-owner dashboard analytics. One endpoint, one query pipeline —
// caller passes ?period=7d|30d|12m, we compute everything the four
// wired dashboard tabs (Overview, Analytics, Customers, Audience) need.
// Café is resolved from the barista's session; never trust the client.
//
// Contract mirrors the shapes in lib/mockData.ts + lib/helpers.ts so
// the existing components can consume without further refactoring.

const PRICE_PER_STAMP = 0.05

type Period = '7d' | '30d' | '12m'

interface DataPoint {
  label: string
  stamps: number
  users: number
  newUsers: number
  revenue: number
}
interface HourlyPoint {
  hour: string
  visits: number
  newVisits: number
  returningVisits: number
}
interface CustomerRow {
  id: string
  name: string
  email: string
  visits: number
  stamps: number
  lastVisit: string
  cafe: string
  status: 'active' | 'dormant'
}
interface AnalyticsResponse {
  period: Period
  todayStats: {
    stampsToday: number
    activeUsers: number
    newUsers: number
    rewardsRedeemed: number
    billableToday: number
  }
  periodData: DataPoint[]
  hourlyData: HourlyPoint[]
  customers: CustomerRow[]
  audience: {
    newUsers: number
    returningUsers: number
    totalUsers: number
    frequencyBands: { label: string; users: number }[]
    rewardRedemptionPct: number
  }
}

interface StampRow {
  user_id: string
  scanned_at: string
}
interface RewardRow {
  id: string
  redeemed_at: string | null
}

function periodStartMs(period: Period, now: number): number {
  if (period === '7d') return now - 7 * 24 * 60 * 60 * 1000
  if (period === '30d') return now - 30 * 24 * 60 * 60 * 1000
  return now - 365 * 24 * 60 * 60 * 1000
}

// Build the empty buckets first — days for 7d/30d, months for 12m —
// then fold real stamp counts in. Fills gaps with zeros so charts don't
// have holes.
function emptyBuckets(period: Period, now: Date): Map<string, DataPoint> {
  const buckets = new Map<string, DataPoint>()
  if (period === '12m') {
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets.set(key, { label: monthLabels[d.getMonth()], stamps: 0, users: 0, newUsers: 0, revenue: 0 })
    }
    return buckets
  }
  const days = period === '7d' ? 7 : 30
  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = period === '7d' ? dayLabels[d.getDay()] : String(d.getDate())
    buckets.set(key, { label, stamps: 0, users: 0, newUsers: 0, revenue: 0 })
  }
  return buckets
}

function bucketKey(period: Period, iso: string): string {
  const d = new Date(iso)
  if (period === '12m') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hourLabel(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function classifyBand(count: number): string {
  if (count === 1) return '1 visit'
  if (count <= 3) return '2–3 visits'
  if (count <= 9) return '4–9 visits'
  return '10+ visits'
}

export async function GET(request: Request) {
  const barista = await getBaristaCafe()
  if (!barista) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Not signed in as a barista.' }, { status: 403 })
  }
  const url = new URL(request.url)
  const periodParam = url.searchParams.get('period')
  const period: Period = (periodParam === '30d' || periodParam === '12m') ? periodParam : '7d'
  const cafeId = barista.cafeId
  const cafeName = barista.cafeName

  const sb = supabaseAdmin()
  const now = new Date()
  const todayStartIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const periodStartIso = new Date(periodStartMs(period, now.getTime())).toISOString()

  // Fetch in parallel — 5 queries.
  const [
    stampsInPeriodRes,
    firstStampsRes,
    todayStampsRes,
    rewardsRedeemedRes,
    customerAggRes,
  ] = await Promise.all([
    // 1. Every stamp at this café in the period. Small enough for a
    //    café's activity window; we aggregate client-side.
    sb.from('stamps')
      .select('user_id, scanned_at')
      .eq('cafe_id', cafeId)
      .gte('scanned_at', periodStartIso)
      .order('scanned_at', { ascending: true }),

    // 2. First-stamp-at-this-café per user, ever. Used to compute
    //    "new users" per bucket + audience new-vs-returning.
    sb.rpc('_analytics_first_stamps', { p_cafe_id: cafeId }).select('*'),

    // 3. Today's stamps (subset of periodData but computed separately
    //    to isolate the todayStats block).
    sb.from('stamps')
      .select('user_id, scanned_at')
      .eq('cafe_id', cafeId)
      .gte('scanned_at', todayStartIso),

    // 4. Rewards redeemed at this café — filter by period for todayStats.rewardsRedeemed.
    sb.from('rewards')
      .select('id, redeemed_at')
      .eq('redeemed_cafe_id', cafeId)
      .not('redeemed_at', 'is', null)
      .gte('redeemed_at', periodStartIso),

    // 5. Customer aggregate. Grabs everyone who has EVER stamped here
    //    + their stamp count + last visit. Ordered by stamps desc.
    sb.rpc('_analytics_customers', { p_cafe_id: cafeId }).select('*'),
  ])

  if (stampsInPeriodRes.error) {
    return NextResponse.json({ error: 'DB_ERROR', message: stampsInPeriodRes.error.message }, { status: 500 })
  }

  const stampsInPeriod: StampRow[] = (stampsInPeriodRes.data ?? []) as StampRow[]
  const firstStamps: { user_id: string; first_at: string }[] =
    (firstStampsRes.data as { user_id: string; first_at: string }[] | null) ?? []
  const todayStamps: StampRow[] = (todayStampsRes.data ?? []) as StampRow[]
  const rewardsRedeemed: RewardRow[] = (rewardsRedeemedRes.data ?? []) as RewardRow[]
  const customerAgg: {
    user_id: string; name: string; email: string | null;
    stamps: number; visits: number; last_visit: string;
  }[] = (customerAggRes.data as { user_id: string; name: string; email: string | null; stamps: number; visits: number; last_visit: string }[] | null) ?? []

  const firstStampByUser = new Map(firstStamps.map((r) => [r.user_id, r.first_at]))

  // ── periodData ─────────────────────────────────────────────────────
  const buckets = emptyBuckets(period, now)
  const bucketUserSets = new Map<string, Set<string>>()
  for (const key of Array.from(buckets.keys())) bucketUserSets.set(key, new Set())
  for (const s of stampsInPeriod) {
    const k = bucketKey(period, s.scanned_at)
    const bucket = buckets.get(k)
    if (!bucket) continue
    bucket.stamps += 1
    bucket.revenue = +(bucket.stamps * PRICE_PER_STAMP).toFixed(2)
    bucketUserSets.get(k)?.add(s.user_id)
  }
  for (const [k, set] of Array.from(bucketUserSets.entries())) {
    const bucket = buckets.get(k)
    if (bucket) bucket.users = set.size
  }
  // newUsers per bucket: bucket where the user's first_at falls
  for (const { user_id, first_at } of firstStamps) {
    const k = bucketKey(period, first_at)
    const bucket = buckets.get(k)
    if (bucket && new Date(first_at).getTime() >= new Date(periodStartIso).getTime()) {
      bucket.newUsers += 1
    }
    void user_id
  }
  const periodData: DataPoint[] = Array.from(buckets.values())

  // ── hourlyData ─────────────────────────────────────────────────────
  const hourly = new Map<number, { visits: number; newVisits: number; returningVisits: number }>()
  for (let h = 0; h < 24; h++) hourly.set(h, { visits: 0, newVisits: 0, returningVisits: 0 })
  const periodStartMillis = new Date(periodStartIso).getTime()
  for (const s of stampsInPeriod) {
    const d = new Date(s.scanned_at)
    const h = d.getHours()
    const entry = hourly.get(h)!
    entry.visits += 1
    const firstAt = firstStampByUser.get(s.user_id)
    if (firstAt && new Date(firstAt).getTime() >= periodStartMillis && firstAt === s.scanned_at) {
      entry.newVisits += 1
    } else {
      entry.returningVisits += 1
    }
  }
  // Trim to 7am–6pm range (matches Yoav's mock; keeps chart legible).
  const hourlyData: HourlyPoint[] = Array.from(hourly.entries())
    .filter(([h]) => h >= 7 && h <= 18)
    .map(([h, v]) => ({ hour: hourLabel(h), visits: v.visits, newVisits: v.newVisits, returningVisits: v.returningVisits }))

  // ── customers list ─────────────────────────────────────────────────
  const DORMANT_DAYS = 30
  const dormantCutoff = now.getTime() - DORMANT_DAYS * 24 * 60 * 60 * 1000
  const customers: CustomerRow[] = customerAgg
    .map((c) => ({
      id: c.user_id,
      name: c.name || 'Friend',
      email: c.email ?? '',
      visits: c.visits,
      stamps: c.stamps,
      lastVisit: c.last_visit.slice(0, 10),
      cafe: cafeName,
      status: (new Date(c.last_visit).getTime() >= dormantCutoff ? 'active' : 'dormant') as 'active' | 'dormant',
    }))
    .slice(0, 100) // cap for payload size

  // ── todayStats ─────────────────────────────────────────────────────
  const stampsToday = todayStamps.length
  const activeUsersToday = new Set(todayStamps.map((s) => s.user_id)).size
  const todayStartMs = new Date(todayStartIso).getTime()
  const newUsersToday = firstStamps.filter((r) => new Date(r.first_at).getTime() >= todayStartMs).length
  const rewardsRedeemedToday = rewardsRedeemed.filter((r) => r.redeemed_at && new Date(r.redeemed_at).getTime() >= todayStartMs).length

  // ── audience ──────────────────────────────────────────────────────
  const usersByStampCountInPeriod = new Map<string, number>()
  for (const s of stampsInPeriod) {
    usersByStampCountInPeriod.set(s.user_id, (usersByStampCountInPeriod.get(s.user_id) ?? 0) + 1)
  }
  const totalUsers = usersByStampCountInPeriod.size
  const newUsers = firstStamps.filter((r) => new Date(r.first_at).getTime() >= periodStartMillis).length
  const returningUsers = Math.max(0, totalUsers - newUsers)
  const bandCounts = new Map<string, number>([
    ['1 visit', 0],
    ['2–3 visits', 0],
    ['4–9 visits', 0],
    ['10+ visits', 0],
  ])
  for (const count of Array.from(usersByStampCountInPeriod.values())) {
    const band = classifyBand(count)
    bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1)
  }
  const frequencyBands = Array.from(bandCounts.entries()).map(([label, users]) => ({ label, users }))

  // Redemption pct: rewards redeemed here in period / total stamps in period /9
  // Rough — assumes 9 stamps ≈ 1 unlocked reward. Good enough for a KPI display.
  const unlockedInPeriod = Math.floor(stampsInPeriod.length / 9)
  const rewardRedemptionPct = unlockedInPeriod === 0 ? 0 : Math.round((rewardsRedeemed.length / unlockedInPeriod) * 100)

  const payload: AnalyticsResponse = {
    period,
    todayStats: {
      stampsToday,
      activeUsers: activeUsersToday,
      newUsers: newUsersToday,
      rewardsRedeemed: rewardsRedeemedToday,
      billableToday: +(stampsToday * PRICE_PER_STAMP).toFixed(2),
    },
    periodData,
    hourlyData,
    customers,
    audience: {
      newUsers,
      returningUsers,
      totalUsers,
      frequencyBands,
      rewardRedemptionPct: Math.min(100, rewardRedemptionPct),
    },
  }
  return NextResponse.json(payload)
}
