// Shape returned by GET /api/analytics — imported by both the route
// handler and the dashboard page so they stay in lockstep.
//
// The individual shapes deliberately mirror what lib/mockData.ts +
// lib/helpers.ts exported so the existing dashboard components consume
// real data without further refactoring.

import type { Customer, DataPoint, HourlyPoint, Period } from './mockData'
import type { TodayStats } from './helpers'

export type { Customer, DataPoint, HourlyPoint, Period, TodayStats }

export interface AnalyticsResponse {
  period: Period
  todayStats: TodayStats
  periodData: DataPoint[]
  hourlyData: HourlyPoint[]
  customers: Customer[]
  audience: {
    newUsers: number
    returningUsers: number
    totalUsers: number
    frequencyBands: { label: string; users: number }[]
    rewardRedemptionPct: number
  }
}
