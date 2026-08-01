export type Period = '7d' | '30d' | '12m'

// ── Privacy threshold (k-anonymity) ─────────────────────────────────────────
// Never display any data group with fewer than this many users.
export const PRIVACY_THRESHOLD = 10

export interface CityGroup {
  city: string
  country: string  // ISO 3166-1 Alpha-3
  users: number
}

export interface FrequencyBand {
  label: string
  users: number
}

export interface AudienceData {
  cities: CityGroup[]
  frequencyBands: FrequencyBand[]
  rewardRedemptionPct: number
  atRiskPct: number
  loyalPct: number
  newUsers: number
  returningUsers: number
  totalUsers: number
}

export const audienceData: Record<Period, AudienceData> = {
  '7d': {
    cities: [
      { city: 'Vienna',    country: 'AUT', users: 28 },
      { city: 'Graz',      country: 'AUT', users: 10 },
      { city: 'Linz',      country: 'AUT', users: 8  }, // suppressed
      { city: 'Salzburg',  country: 'AUT', users: 7  }, // suppressed
      { city: 'Munich',    country: 'DEU', users: 5  }, // suppressed
    ],
    frequencyBands: [
      { label: '1 visit',    users: 22 },
      { label: '2–3 visits', users: 14 },
      { label: '4–9 visits', users: 8  }, // suppressed
      { label: '10+ visits', users: 3  }, // suppressed
    ],
    rewardRedemptionPct: 28,
    atRiskPct: 14,
    loyalPct: 19,
    newUsers: 24,
    returningUsers: 14,
    totalUsers: 38,
  },
  '30d': {
    cities: [
      { city: 'Vienna',     country: 'AUT', users: 124 },
      { city: 'Graz',       country: 'AUT', users: 38  },
      { city: 'Linz',       country: 'AUT', users: 29  },
      { city: 'Salzburg',   country: 'AUT', users: 21  },
      { city: 'Munich',     country: 'DEU', users: 18  },
      { city: 'Bratislava', country: 'SVK', users: 14  },
      { city: 'Innsbruck',  country: 'AUT', users: 12  },
      { city: 'Zürich',     country: 'CHE', users: 8   }, // suppressed
      { city: 'Berlin',     country: 'DEU', users: 6   }, // suppressed
    ],
    frequencyBands: [
      { label: '1 visit',    users: 89  },
      { label: '2–3 visits', users: 67  },
      { label: '4–9 visits', users: 48  },
      { label: '10+ visits', users: 22  },
    ],
    rewardRedemptionPct: 38,
    atRiskPct: 22,
    loyalPct: 31,
    newUsers: 520,
    returningUsers: 1240,
    totalUsers: 1760,
  },
  '12m': {
    cities: [
      { city: 'Vienna',     country: 'AUT', users: 1240 },
      { city: 'Graz',       country: 'AUT', users: 380  },
      { city: 'Linz',       country: 'AUT', users: 290  },
      { city: 'Salzburg',   country: 'AUT', users: 210  },
      { city: 'Munich',     country: 'DEU', users: 185  },
      { city: 'Bratislava', country: 'SVK', users: 142  },
      { city: 'Innsbruck',  country: 'AUT', users: 118  },
      { city: 'Zürich',     country: 'CHE', users: 95   },
      { city: 'Berlin',     country: 'DEU', users: 72   },
      { city: 'Budapest',   country: 'HUN', users: 48   },
      { city: 'Prague',     country: 'CZE', users: 31   },
      { city: 'Amsterdam',  country: 'NLD', users: 18   },
    ],
    frequencyBands: [
      { label: '1 visit',    users: 890 },
      { label: '2–3 visits', users: 670 },
      { label: '4–9 visits', users: 482 },
      { label: '10+ visits', users: 228 },
    ],
    rewardRedemptionPct: 44,
    atRiskPct: 19,
    loyalPct: 32,
    newUsers: 5200,
    returningUsers: 12400,
    totalUsers: 17600,
  },
}

export interface DataPoint {
  label: string
  stamps: number
  users: number
  newUsers: number
  revenue: number
}

export interface HourlyPoint {
  hour: string
  visits: number
  newVisits: number
  returningVisits: number
}

export interface Customer {
  // string because real customer ids are UUIDs (public.users.id).
  // The mock demo rows below use string ids too now for consistency.
  id: string
  name: string
  email: string
  visits: number
  stamps: number
  lastVisit: string
  cafe: string
  status: 'active' | 'dormant'
}

export interface Invoice {
  id: string
  period: string
  stamps: number
  amount: number
  issued: string
  status: 'paid' | 'pending'
}

// 30-day fixed data (avoids hydration issues from Math.random)
const stamps30 = [162, 201, 188, 223, 267, 245, 198, 212, 189, 234, 278, 256, 203, 219, 245, 231, 198, 267, 289, 245, 211, 198, 223, 245, 278, 234, 201, 189, 212, 247]
const users30  = [100, 125, 117, 138, 166, 152, 123, 131, 117, 145, 172, 159, 126, 136, 152, 143, 123, 165, 179, 152, 131, 123, 138, 152, 172, 145, 125, 117, 131, 153]
const new30    = [12,   18,  14,  21,  19,  16,  13,  17,  11,  20,  22,  18,  15,  19,  16,  14,  18,  23,  25,  20,  16,  14,  19,  20,  22,  18,  15,  13,  17,  21]

export const periodData: Record<Period, DataPoint[]> = {
  '7d': [
    { label: 'Mon', stamps: 142, users:  98, newUsers: 12, revenue:  7.10 },
    { label: 'Tue', stamps: 189, users: 121, newUsers: 18, revenue:  9.45 },
    { label: 'Wed', stamps: 204, users: 138, newUsers: 21, revenue: 10.20 },
    { label: 'Thu', stamps: 176, users: 115, newUsers:  9, revenue:  8.80 },
    { label: 'Fri', stamps: 231, users: 158, newUsers: 24, revenue: 11.55 },
    { label: 'Sat', stamps: 298, users: 201, newUsers: 31, revenue: 14.90 },
    { label: 'Sun', stamps: 187, users: 129, newUsers: 15, revenue:  9.35 },
  ],
  '30d': stamps30.map((s, i) => ({
    label: String(i + 1),
    stamps: s,
    users: users30[i],
    newUsers: new30[i],
    revenue: +(s * 0.05).toFixed(2),
  })),
  '12m': [
    { label: 'Jan', stamps: 3200, users: 180, newUsers:  45, revenue: 160 },
    { label: 'Feb', stamps: 3800, users: 210, newUsers:  52, revenue: 190 },
    { label: 'Mar', stamps: 4100, users: 248, newUsers:  67, revenue: 205 },
    { label: 'Apr', stamps: 3900, users: 235, newUsers:  48, revenue: 195 },
    { label: 'May', stamps: 4600, users: 290, newUsers:  71, revenue: 230 },
    { label: 'Jun', stamps: 5200, users: 340, newUsers:  83, revenue: 260 },
    { label: 'Jul', stamps: 4800, users: 315, newUsers:  62, revenue: 240 },
    { label: 'Aug', stamps: 5600, users: 380, newUsers:  89, revenue: 280 },
    { label: 'Sep', stamps: 5100, users: 355, newUsers:  75, revenue: 255 },
    { label: 'Oct', stamps: 5900, users: 410, newUsers:  92, revenue: 295 },
    { label: 'Nov', stamps: 6400, users: 450, newUsers:  98, revenue: 320 },
    { label: 'Dec', stamps: 5720, users: 434, newUsers:  81, revenue: 286 },
  ],
}

export const hourlyData: HourlyPoint[] = [
  { hour: '7am',  visits:  28, newVisits:  8, returningVisits:  20 },
  { hour: '8am',  visits:  67, newVisits: 18, returningVisits:  49 },
  { hour: '9am',  visits: 112, newVisits: 24, returningVisits:  88 },
  { hour: '10am', visits:  89, newVisits: 20, returningVisits:  69 },
  { hour: '11am', visits:  74, newVisits: 18, returningVisits:  56 },
  { hour: '12pm', visits:  95, newVisits: 28, returningVisits:  67 },
  { hour: '1pm',  visits: 108, newVisits: 30, returningVisits:  78 },
  { hour: '2pm',  visits:  71, newVisits: 17, returningVisits:  54 },
  { hour: '3pm',  visits:  58, newVisits: 14, returningVisits:  44 },
  { hour: '4pm',  visits:  63, newVisits: 16, returningVisits:  47 },
  { hour: '5pm',  visits:  84, newVisits: 20, returningVisits:  64 },
  { hour: '6pm',  visits:  42, newVisits: 10, returningVisits:  32 },
]

export const customers: Customer[] = [
  { id: '1', name: 'Emma Wilson',   email: 'emma@example.com',   visits: 47, stamps: 312, lastVisit: '2024-12-15', cafe: 'The Corner Brew', status: 'active'  },
  { id: '2', name: 'James Park',    email: 'james@example.com',  visits: 31, stamps: 198, lastVisit: '2024-12-15', cafe: 'Bean & Gone',      status: 'active'  },
  { id: '3', name: 'Sarah Chen',    email: 'sarah@example.com',  visits: 52, stamps: 341, lastVisit: '2024-12-14', cafe: 'The Corner Brew', status: 'active'  },
  { id: '4', name: 'Oliver Smith',  email: 'oliver@example.com', visits: 18, stamps: 112, lastVisit: '2024-12-14', cafe: 'Grounds Up',       status: 'dormant' },
  { id: '5', name: 'Aisha Patel',   email: 'aisha@example.com',  visits: 39, stamps: 267, lastVisit: '2024-12-13', cafe: 'Morning Pages',    status: 'active'  },
  { id: '6', name: 'Lucas Müller',  email: 'lucas@example.com',  visits: 24, stamps: 156, lastVisit: '2024-12-13', cafe: 'Bean & Gone',      status: 'active'  },
  { id: '7', name: 'Priya Nair',    email: 'priya@example.com',  visits:  8, stamps:  44, lastVisit: '2024-12-12', cafe: 'Grounds Up',       status: 'dormant' },
  { id: '8', name: 'Tom Baker',     email: 'tom@example.com',    visits: 61, stamps: 418, lastVisit: '2024-12-12', cafe: 'The Corner Brew', status: 'active'  },
  { id: '9', name: 'Mei Zhang',     email: 'mei@example.com',    visits: 29, stamps: 187, lastVisit: '2024-12-11', cafe: 'Morning Pages',    status: 'active'  },
  { id: '10', name: 'Daniel Roy',    email: 'daniel@example.com', visits: 13, stamps:  79, lastVisit: '2024-12-11', cafe: 'Grounds Up',       status: 'dormant' },
  { id: '11', name: 'Chloe Martin',  email: 'chloe@example.com',  visits: 44, stamps: 289, lastVisit: '2024-12-10', cafe: 'Morning Pages',    status: 'active'  },
  { id: '12', name: "Ryan O'Brien",  email: 'ryan@example.com',   visits: 35, stamps: 224, lastVisit: '2024-12-10', cafe: 'Bean & Gone',      status: 'active'  },
]

export const invoices: Invoice[] = [
  { id: 'INV-2024-12', period: 'December 2024',   stamps: 5720, amount: 286.00, issued: '2025-01-01', status: 'pending' },
  { id: 'INV-2024-11', period: 'November 2024',   stamps: 6400, amount: 320.00, issued: '2024-12-01', status: 'paid'    },
  { id: 'INV-2024-10', period: 'October 2024',    stamps: 5900, amount: 295.00, issued: '2024-11-01', status: 'paid'    },
  { id: 'INV-2024-09', period: 'September 2024',  stamps: 5100, amount: 255.00, issued: '2024-10-01', status: 'paid'    },
  { id: 'INV-2024-08', period: 'August 2024',     stamps: 5600, amount: 280.00, issued: '2024-09-01', status: 'paid'    },
  { id: 'INV-2024-07', period: 'July 2024',       stamps: 4800, amount: 240.00, issued: '2024-08-01', status: 'paid'    },
]

// ── Peak vs off-peak ratio ────────────────────────────────────────────────────
// Peak windows: 7–10am (morning rush) and 11:30–2pm (lunch rush)

export interface PeakOffPeakData {
  peakPct: number
  offPeakPct: number
  interpretation: string
}

export const peakOffPeakData: Record<Period, PeakOffPeakData> = {
  '7d': {
    peakPct: 54,
    offPeakPct: 46,
    interpretation: 'Most of your loyal customers visit during busy hours — consider a quiet hour reward to grow off-peak volume.',
  },
  '30d': {
    peakPct: 58,
    offPeakPct: 42,
    interpretation: 'Peak hours dominate stamp activity this month — your morning and lunch rushes are your strongest asset.',
  },
  '12m': {
    peakPct: 56,
    offPeakPct: 44,
    interpretation: 'Your customers visit predominantly during rush hours — a consistent year-round pattern you can plan around.',
  },
}

// ── Billing projection mock ───────────────────────────────────────────────────

export interface BillingProjection {
  stampsToDate: number
  daysElapsed: number
  daysInMonth: number
  lastMonthAmount: number
}

export const billingProjection: BillingProjection = {
  stampsToDate: 2863,
  daysElapsed: 19,
  daysInMonth: 30,
  lastMonthAmount: 320.00,
}

// ── Notify nearby lapsed users ────────────────────────────────────────────────

export const notifyEligibleUsers: number = 12

// ── Strudl Health Score ───────────────────────────────────────────────────────

export interface HealthScore {
  overall: number
  retention: number
  engagement: number
  growth: number
  interpretation: string
}

export const healthScoreData: Record<Period, HealthScore> = {
  '7d': {
    overall: 82, retention: 74, engagement: 89, growth: 80,
    interpretation: 'Your loyalty program is performing well. Retention has room to improve this week.',
  },
  '30d': {
    overall: 84, retention: 76, engagement: 91, growth: 82,
    interpretation: 'Your loyalty program is performing well. Retention could be improved.',
  },
  '12m': {
    overall: 87, retention: 81, engagement: 93, growth: 85,
    interpretation: 'Strong year-round performance. Engagement and growth are both trending up.',
  },
}

// ── Needs-your-attention items ────────────────────────────────────────────────

export interface AttentionItem {
  text: string
  tab: string       // dashboard tab id to navigate to
  linkLabel: string
}

export const attentionData: Record<Period, AttentionItem[] | null> = {
  '7d': [
    { text: '47 users haven\'t visited in 30+ days',       tab: 'insights',  linkLabel: 'Go to Audience →'   },
    { text: 'Reward redemption rate dropped 8% this week', tab: 'analytics', linkLabel: 'View Analytics →'   },
    { text: 'Tue 14:00–16:00 had zero stamps',             tab: 'analytics', linkLabel: 'View Analytics →'   },
  ],
  '30d': [
    { text: '47 users haven\'t visited in 30+ days',        tab: 'insights',  linkLabel: 'Go to Audience →'  },
    { text: 'Reward redemption rate dropped 8% this month', tab: 'analytics', linkLabel: 'View Analytics →'  },
  ],
  '12m': null,
}

// ── Global city dataset (used by globe + customer origin table) ──────────────

export interface GlobalCity {
  city: string
  country: string   // ISO 3166-1 Alpha-3
  lat: number
  lng: number
  users: number     // 12-month base count
  isHome: boolean
}

export const GLOBAL_CITIES: GlobalCity[] = [
  // Europe — home + neighbours, highest user counts
  { city: 'Vienna',       country: 'AUT', users: 340, lat:  48.2082, lng:  16.3738, isHome: true  },
  { city: 'Graz',         country: 'AUT', users: 142, lat:  47.0707, lng:  15.4395, isHome: false },
  { city: 'Salzburg',     country: 'AUT', users: 118, lat:  47.8095, lng:  13.0550, isHome: false },
  { city: 'Linz',         country: 'AUT', users:  95, lat:  48.3069, lng:  14.2858, isHome: false },
  { city: 'Budapest',     country: 'HUN', users: 128, lat:  47.4979, lng:  19.0402, isHome: false },
  { city: 'Prague',       country: 'CZE', users: 112, lat:  50.0755, lng:  14.4378, isHome: false },
  { city: 'Munich',       country: 'DEU', users: 189, lat:  48.1351, lng:  11.5820, isHome: false },
  { city: 'Zurich',       country: 'CHE', users:  84, lat:  47.3769, lng:   8.5417, isHome: false },
  { city: 'Berlin',       country: 'DEU', users: 156, lat:  52.5200, lng:  13.4050, isHome: false },
  { city: 'Amsterdam',    country: 'NLD', users:  73, lat:  52.3676, lng:   4.9041, isHome: false },
  { city: 'Paris',        country: 'FRA', users: 201, lat:  48.8566, lng:   2.3522, isHome: false },
  { city: 'London',       country: 'GBR', users: 247, lat:  51.5074, lng:  -0.1278, isHome: false },
  { city: 'Warsaw',       country: 'POL', users:  61, lat:  52.2297, lng:  21.0122, isHome: false },
  { city: 'Rome',         country: 'ITA', users:  88, lat:  41.9028, lng:  12.4964, isHome: false },
  { city: 'Barcelona',    country: 'ESP', users: 109, lat:  41.3851, lng:   2.1734, isHome: false },
  { city: 'Stockholm',    country: 'SWE', users:  55, lat:  59.3293, lng:  18.0686, isHome: false },
  { city: 'Copenhagen',   country: 'DNK', users:  48, lat:  55.6761, lng:  12.5683, isHome: false },
  { city: 'Lisbon',       country: 'PRT', users:  62, lat:  38.7223, lng:  -9.1393, isHome: false },
  // Americas
  { city: 'New York',     country: 'USA', users: 178, lat:  40.7128, lng: -74.0060, isHome: false },
  { city: 'Los Angeles',  country: 'USA', users: 134, lat:  34.0522, lng:-118.2437, isHome: false },
  { city: 'Chicago',      country: 'USA', users:  98, lat:  41.8781, lng: -87.6298, isHome: false },
  { city: 'Miami',        country: 'USA', users:  71, lat:  25.7617, lng: -80.1918, isHome: false },
  { city: 'Toronto',      country: 'CAN', users:  89, lat:  43.6532, lng: -79.3832, isHome: false },
  { city: 'São Paulo',    country: 'BRA', users:  67, lat: -23.5505, lng: -46.6333, isHome: false },
  { city: 'Mexico City',  country: 'MEX', users:  52, lat:  19.4326, lng: -99.1332, isHome: false },
  { city: 'Buenos Aires', country: 'ARG', users:  38, lat: -34.6037, lng: -58.3816, isHome: false },
  { city: 'Bogotá',       country: 'COL', users:  29, lat:   4.7110, lng: -74.0721, isHome: false },
  // Asia
  { city: 'Tokyo',        country: 'JPN', users: 214, lat:  35.6762, lng: 139.6503, isHome: false },
  { city: 'Seoul',        country: 'KOR', users: 143, lat:  37.5665, lng: 126.9780, isHome: false },
  { city: 'Singapore',    country: 'SGP', users: 168, lat:   1.3521, lng: 103.8198, isHome: false },
  { city: 'Bangkok',      country: 'THA', users:  92, lat:  13.7563, lng: 100.5018, isHome: false },
  { city: 'Dubai',        country: 'ARE', users: 187, lat:  25.2048, lng:  55.2708, isHome: false },
  { city: 'Istanbul',     country: 'TUR', users: 119, lat:  41.0082, lng:  28.9784, isHome: false },
  { city: 'Mumbai',       country: 'IND', users:  78, lat:  19.0760, lng:  72.8777, isHome: false },
  { city: 'Hong Kong',    country: 'HKG', users: 156, lat:  22.3193, lng: 114.1694, isHome: false },
  { city: 'Taipei',       country: 'TWN', users:  88, lat:  25.0330, lng: 121.5654, isHome: false },
  { city: 'Jakarta',      country: 'IDN', users:  45, lat:  -6.2088, lng: 106.8456, isHome: false },
  // Africa
  { city: 'Cairo',        country: 'EGY', users:  63, lat:  30.0444, lng:  31.2357, isHome: false },
  { city: 'Lagos',        country: 'NGA', users:  34, lat:   6.5244, lng:   3.3792, isHome: false },
  { city: 'Nairobi',      country: 'KEN', users:  28, lat:  -1.2921, lng:  36.8219, isHome: false },
  { city: 'Cape Town',    country: 'ZAF', users:  41, lat: -33.9249, lng:  18.4241, isHome: false },
  // Oceania
  { city: 'Sydney',       country: 'AUS', users: 112, lat: -33.8688, lng: 151.2093, isHome: false },
  { city: 'Melbourne',    country: 'AUS', users:  87, lat: -37.8136, lng: 144.9631, isHome: false },
  { city: 'Auckland',     country: 'NZL', users:  34, lat: -36.8485, lng: 174.7633, isHome: false },
]

// Period multipliers: 7d ≈ weekly slice, 30d ≈ monthly, 12m = full base
const PERIOD_MULT: Record<Period, number> = { '12m': 1.0, '30d': 0.20, '7d': 0.07 }

// Returns period-scaled, threshold-filtered, descending-sorted city list.
// `users` on each returned city is the period count (not the 12m base).
export function getPeriodCities(period: Period): GlobalCity[] {
  const mult = PERIOD_MULT[period]
  return GLOBAL_CITIES
    .map(c => ({ ...c, users: Math.max(0, Math.round(c.users * mult)) }))
    .filter(c => c.users >= PRIVACY_THRESHOLD)
    .sort((a, b) => b.users - a.users)
}

// Legacy export — still referenced by existing files
export const monthlyData = periodData['12m'].map(d => ({ month: d.label, revenue: d.revenue, users: d.users }))
export const transactions = [
  { id: '1',  date: '2024-12-15', cafe: 'The Corner Brew', customer: 'Emma Wilson',  amount: '€4.80', status: 'Completed' },
  { id: '2',  date: '2024-12-15', cafe: 'Bean & Gone',     customer: 'James Park',   amount: '€3.50', status: 'Completed' },
  { id: '3',  date: '2024-12-14', cafe: 'The Corner Brew', customer: 'Sarah Chen',   amount: '€5.20', status: 'Completed' },
  { id: '4',  date: '2024-12-14', cafe: 'Grounds Up',      customer: 'Oliver Smith', amount: '€2.90', status: 'Redeemed'  },
  { id: '5',  date: '2024-12-13', cafe: 'Morning Pages',   customer: 'Aisha Patel',  amount: '€4.10', status: 'Completed' },
  { id: '6',  date: '2024-12-13', cafe: 'Bean & Gone',     customer: 'Lucas Müller', amount: '€6.40', status: 'Completed' },
  { id: '7',  date: '2024-12-12', cafe: 'Grounds Up',      customer: 'Priya Nair',   amount: '€3.80', status: 'Pending'   },
  { id: '8',  date: '2024-12-12', cafe: 'The Corner Brew', customer: 'Tom Baker',    amount: '€4.50', status: 'Completed' },
  { id: '9',  date: '2024-12-11', cafe: 'Morning Pages',   customer: 'Mei Zhang',    amount: '€5.00', status: 'Redeemed'  },
  { id: '10', date: '2024-12-11', cafe: 'Grounds Up',      customer: 'Daniel Roy',   amount: '€3.20', status: 'Completed' },
]
