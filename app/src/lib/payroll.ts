import type { DB, ISODate, PayrollLine, SalaryStructure, StatutorySettings } from '@/data/types'
import { eachDay, isSunday } from './utils'

export const grossOf = (s: Pick<SalaryStructure, 'basic' | 'hra' | 'special'>) => s.basic + s.hra + s.special

export function deductions(s: SalaryStructure, st: StatutorySettings) {
  const gross = grossOf(s)
  const pfBase = st.pfUseCeiling ? Math.min(s.basic, st.pfWageCeiling) : s.basic
  const pf = st.pfEnabled && s.pfEnabled ? Math.round((pfBase * st.pfEmployeePct) / 100) : 0
  const employerPf = st.pfEnabled && s.pfEnabled ? Math.round((pfBase * st.pfEmployerPct) / 100) : 0
  const esi = st.esiEnabled && gross <= st.esiGrossLimit ? Math.round((gross * st.esiEmployeePct) / 100) : 0
  const pt = st.ptEnabled ? st.ptOverride ?? (gross >= 10000 ? 200 : gross >= 7500 ? 175 : 0) : 0
  const tds = st.tdsEnabled ? s.tdsMonthly : 0
  const total = pf + esi + pt + tds + s.otherDeductions
  return { gross, pf, employerPf, esi, pt, tds, other: s.otherDeductions, total, net: gross - total }
}

/** Loss-of-pay days: absences on working days + approved unpaid leave inside the period. */
export function lwpDaysFor(db: DB, empId: string, from: ISODate, to: ISODate) {
  const unpaid = new Set(db.leaveTypes.filter((t) => !t.paid).map((t) => t.id))
  const absent = db.attendance.filter((a) => a.empId === empId && a.date >= from && a.date <= to && a.status === 'absent').length
  const halfDays = db.attendance.filter((a) => a.empId === empId && a.date >= from && a.date <= to && a.status === 'half-day').length
  const unpaidLeave = db.leaves
    .filter((l) => l.empId === empId && l.status === 'approved' && unpaid.has(l.typeId))
    .reduce((n, l) => n + eachDay(l.from, l.to).filter((d) => d >= from && d <= to && !isSunday(d)).length, 0)
  return absent + unpaidLeave + halfDays * 0.5
}

export function buildPayrollLines(db: DB, from: ISODate, to: ISODate, lwpOverrides: Record<string, number> = {}): PayrollLine[] {
  const days = eachDay(from, to)
  const workingDays = days.filter((d) => !isSunday(d)).length
  const fullMonth = days.length >= 28
  return db.salaries
    .filter((s) => {
      const e = db.employees.find((x) => x.id === s.empId)
      return e && e.status !== 'inactive' && e.joinDate <= to
    })
    .map((s) => {
      const d = deductions(s, db.statutory)
      // Partial ranges are prorated by calendar days; each LWP day deducts gross ÷ 30.
      const prorate = fullMonth ? 1 : days.length / 30
      const gross = Math.round(d.gross * prorate)
      const lwpDays = lwpOverrides[s.empId] ?? lwpDaysFor(db, s.empId, from, to)
      const lwpDeduction = Math.round((d.gross / 30) * lwpDays)
      const net = Math.max(0, gross - lwpDeduction - d.pf - d.esi - d.pt - d.tds - d.other)
      return { empId: s.empId, gross, workingDays, lwpDays, lwpDeduction, pf: d.pf, esi: d.esi, pt: d.pt, tds: d.tds, other: d.other, net }
    })
}

export const runTotals = (lines: PayrollLine[]) =>
  lines.reduce(
    (t, l) => ({
      gross: t.gross + l.gross,
      net: t.net + l.net,
      deductions: t.deductions + (l.gross - l.net),
      lwp: t.lwp + l.lwpDeduction,
      pf: t.pf + l.pf,
    }),
    { gross: 0, net: 0, deductions: 0, lwp: 0, pf: 0 },
  )
