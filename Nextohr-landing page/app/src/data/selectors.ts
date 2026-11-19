// Derived data shared across screens. Pure functions of the DB snapshot.
import type { AttendanceRecord, DB, Employee } from './types'
import { addDays, eachDay, isSunday, today } from '@/lib/utils'

export const empMap = (db: DB) => new Map(db.employees.map((e) => [e.id, e]))
export const activeEmployees = (db: DB) => db.employees.filter((e) => e.status === 'active' || e.status === 'notice')

export const pendingCounts = (db: DB) => {
  const leaves = db.leaves.filter((l) => l.status === 'pending').length
  const reports = db.reports.filter((r) => r.status === 'pending').length
  const offers = db.offers.filter((o) => o.status === 'draft').length
  const onboarding = db.employees.filter((e) => e.status === 'onboarding').length
  return { leaves, reports, offers, onboarding, total: leaves + reports + offers }
}

export type DayState = AttendanceRecord['status'] | 'not-in'

/** One row per active employee for a given date — including people who haven't checked in. */
export function attendanceForDay(db: DB, date: string) {
  const recs = new Map(db.attendance.filter((a) => a.date === date).map((a) => [a.empId, a]))
  return activeEmployees(db)
    .filter((e) => e.joinDate <= date)
    .map((e) => {
      const rec = recs.get(e.id)
      const state: DayState = rec?.status ?? (date === today() ? 'not-in' : 'absent')
      return { emp: e, rec, state }
    })
}

export function daySummary(db: DB, date: string) {
  const rows = attendanceForDay(db, date)
  const count = (s: DayState[]) => rows.filter((r) => s.includes(r.state)).length
  const present = count(['present', 'late', 'half-day'])
  const expected = rows.filter((r) => !['weekend', 'holiday', 'leave'].includes(r.state)).length
  return {
    total: rows.length, present, late: count(['late']), absent: count(['absent']), notIn: count(['not-in']), leave: count(['leave']),
    halfDay: count(['half-day']), expected, rate: expected ? (present / expected) * 100 : 0,
  }
}

/** Attendance rate per working day across a window, for trend charts. */
export function attendanceTrend(db: DB, from: string, to: string) {
  const active = activeEmployees(db)
  return eachDay(from, to)
    .filter((d) => !isSunday(d) && !db.holidays.some((h) => h.date === d && h.type !== 'Optional'))
    .map((d) => {
      const recs = db.attendance.filter((a) => a.date === d && active.some((e) => e.id === a.empId))
      const present = recs.filter((a) => ['present', 'late', 'half-day'].includes(a.status)).length
      const late = recs.filter((a) => a.status === 'late').length
      const leave = recs.filter((a) => a.status === 'leave').length
      const expected = active.filter((e) => e.joinDate <= d).length - leave
      return { date: d, rate: expected ? (present / expected) * 100 : 0, present, late, leave, absent: Math.max(0, expected - present) }
    })
}

export function leaveBalance(db: DB, empId: string) {
  const year = today().slice(0, 4)
  return db.leaveTypes.filter((t) => t.active && t.daysPerYear > 0).map((t) => {
    const used = db.leaves
      .filter((l) => l.empId === empId && l.typeId === t.id && l.status === 'approved' && l.from.startsWith(year))
      .reduce((n, l) => n + l.days, 0)
    return { type: t, used, total: t.daysPerYear, left: Math.max(0, t.daysPerYear - used) }
  })
}

export function profileCompletion(e: Employee) {
  const checks = [
    !!e.phone, !!e.dob, !!e.address.line1, !!e.address.city, !!e.emergency.name, !!e.emergency.phone,
    !!e.bank.account, !!e.bank.ifsc, e.documents.pan, e.documents.aadhaar, e.documents.signature, e.documents.certificates, e.documents.photo,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function upcomingBirthdays(db: DB, days = 30) {
  const t = today()
  return activeEmployees(db)
    .map((e) => {
      let next = `${t.slice(0, 4)}-${e.dob.slice(5)}`
      if (next < t) next = `${Number(t.slice(0, 4)) + 1}-${e.dob.slice(5)}`
      return { emp: e, date: next }
    })
    .filter((x) => x.date <= addDays(t, days))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function workAnniversaries(db: DB, days = 30) {
  const t = today()
  return activeEmployees(db)
    .map((e) => {
      const years = Number(t.slice(0, 4)) - Number(e.joinDate.slice(0, 4))
      let next = `${t.slice(0, 4)}-${e.joinDate.slice(5)}`
      if (next < t) next = `${Number(t.slice(0, 4)) + 1}-${e.joinDate.slice(5)}`
      return { emp: e, date: next, years: next.startsWith(t.slice(0, 4)) ? years : years + 1 }
    })
    .filter((x) => x.years > 0 && x.date <= addDays(t, days))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export const goalProgress = (g: { unit: string; target: number; current: number }) => {
  const lower = g.unit === 'days' || g.unit === 'ms'
  return Math.max(0, Math.min(100, (lower ? g.target / Math.max(g.current, 0.0001) : g.current / g.target) * 100))
}

export const fmtGoalValue = (v: number, unit: string) =>
  unit === '₹' ? `₹${v.toLocaleString('en-IN')}` : unit === '%' ? `${v}%` : `${v.toLocaleString('en-IN')} ${unit}`

/** The most recent date (≤ given date) that was a working day for the company. */
export function lastWorkingDay(db: DB, date = today()) {
  let d = date
  for (let i = 0; i < 10; i++) {
    if (!isSunday(d) && !db.holidays.some((h) => h.date === d && h.type !== 'Optional')) return d
    d = addDays(d, -1)
  }
  return date
}
