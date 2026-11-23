import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Info } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap } from '@/data/selectors'
import { buildPayrollLines, runTotals } from '@/lib/payroll'
import { cn, eachDay, endOfMonth, fmtDate, isSunday, money, monthName, parseISO, startOfMonth, today, toISO } from '@/lib/utils'
import { Button, Card, Field, Input, Person, Segmented, Select, toast } from '@/components/ui'

const STEPS = ['Choose period', 'Review loss of pay', 'Preview & process']

export default function PayrollRunWizard() {
  const nav = useNavigate()
  const db = useDb((d) => d)
  const map = useMemo(() => empMap(db), [db])
  const t = parseISO(today())
  const months = Array.from({ length: 6 }, (_, i) => toISO(new Date(t.getFullYear(), t.getMonth() - i, 1)))
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'month' | 'custom'>('month')
  const [month, setMonth] = useState(months.find((m) => !db.payrollRuns.some((r) => r.from === m)) ?? months[0]!)
  const [from, setFrom] = useState(startOfMonth(today()))
  const [to, setTo] = useState(today())
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  const period = mode === 'month' ? { from: month, to: endOfMonth(month) } : { from, to }
  const overlap = db.payrollRuns.find((r) => r.from <= period.to && r.to >= period.from)
  const sameMonth = period.from.slice(0, 7) === period.to.slice(0, 7)
  const periodError = period.to < period.from ? 'End date is before the start date.' : !sameMonth ? 'A pay run must stay within one calendar month.' : overlap ? `Overlaps the ${overlap.label} run (${fmtDate(overlap.from)} – ${fmtDate(overlap.to)}).` : ''
  const lines = useMemo(() => buildPayrollLines(db, period.from, period.to, overrides), [db, period.from, period.to, overrides])
  const totals = runTotals(lines)
  const skipped = db.salaries.filter((s) => s.basic === 0 && map.get(s.empId)?.status !== 'inactive')
  const holidays = db.holidays.filter((h) => h.date >= period.from && h.date <= period.to && h.type !== 'Optional')
  const workingDays = eachDay(period.from, period.to).filter((d) => !isSunday(d)).length
  const label = mode === 'month' ? `${monthName(parseISO(month).getMonth(), true)} ${parseISO(month).getFullYear()}` : `${fmtDate(from)} – ${fmtDate(to)}`

  const process = async () => {
    setBusy(true)
    const id = await api.payroll.createRun(label, period.from, period.to, lines)
    setBusy(false)
    toast.success(`${label} payroll processed`, { body: `${lines.length} payslips generated · ${money(totals.net)} net` })
    nav(`/payroll/runs/${id}`)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/payroll" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink"><ArrowLeft className="h-4 w-4" /> Payroll</Link>
      <h1 className="text-[26px] font-extrabold tracking-tight">Run payroll</h1>
      <p className="mt-1 text-sm text-subtle">Three quick steps. Nothing is final until you process the run.</p>

      <ol className="my-6 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-on-primary' : 'bg-surface-3 text-subtle')}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>
            <span className={cn('text-sm font-semibold', i === step ? 'text-ink' : 'text-subtle')}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-line-strong" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card title="Which period are you paying?">
          <Segmented value={mode} onChange={setMode} options={[{ value: 'month', label: 'Full month' }, { value: 'custom', label: 'Custom dates' }]} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {mode === 'month' ? (
              <Field label="Month"><Select value={month} onChange={(e) => setMonth(e.target.value)} options={months.map((m) => ({ value: m, label: `${monthName(parseISO(m).getMonth(), true)} ${parseISO(m).getFullYear()}${db.payrollRuns.some((r) => r.from === m) ? ' — already run' : ''}` }))} /></Field>
            ) : (
              <>
                <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
              </>
            )}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[['Working days', workingDays], ['Holidays in period', holidays.length], ['People to pay', lines.length]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-subtle">{k}</p><p className="num text-xl font-extrabold">{v}</p></div>)}
          </div>
          {mode === 'custom' && <p className="mt-4 flex items-start gap-2 text-[13px] text-muted"><Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />A partial range pays (days ÷ 30) of the monthly salary. Use this for mid-month joiners or full & final settlements.</p>}
          {!periodError && period.to > today() && <p className="mt-4 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px] font-semibold text-accent-ink"><Info className="h-4 w-4" />This period ends {fmtDate(period.to)}. Days after today count as worked — you can adjust LWP in the next step.</p>}
          {periodError && <p className="mt-4 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger"><AlertTriangle className="h-4 w-4" />{periodError}</p>}
          {skipped.length > 0 && <p className="mt-4 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-[13px] font-semibold text-[rgb(161_98_7)] dark:text-warning"><AlertTriangle className="h-4 w-4" />{skipped.length} people without a salary structure will be skipped: {skipped.map((s) => map.get(s.empId)?.name).join(', ')}.</p>}
        </Card>
      )}

      {step === 1 && (
        <Card title="Loss of pay" subtitle="Calculated from absences, half days and approved unpaid leave. Each LWP day deducts monthly gross ÷ 30. Adjust if something’s off.">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-y border-line bg-surface-2 text-left text-xs font-bold uppercase tracking-wider text-subtle"><th className="px-5 py-2.5">Employee</th><th className="px-3 py-2.5 text-right">Monthly gross</th><th className="px-3 py-2.5 text-center">LWP days</th><th className="px-5 py-2.5 text-right">Deduction</th></tr></thead>
              <tbody>
                {[...lines].sort((a, b) => b.lwpDays - a.lwpDays).map((l) => (
                  <tr key={l.empId} className={cn('border-b border-line', l.lwpDays > 0 && 'bg-primary-soft/30')}>
                    <td className="px-5 py-2.5"><Person emp={map.get(l.empId)} size={30} link={false} /></td>
                    <td className="num px-3 py-2.5 text-right">{money(l.gross)}</td>
                    <td className="px-3 py-2.5 text-center"><Input type="number" min={0} step={0.5} className="mx-auto w-20 text-center" aria-label={`LWP days for ${map.get(l.empId)?.name}`} value={overrides[l.empId] ?? l.lwpDays} onChange={(e) => setOverrides({ ...overrides, [l.empId]: Math.max(0, Number(e.target.value)) })} /></td>
                    <td className={cn('num px-5 py-2.5 text-right font-semibold', l.lwpDeduction > 0 ? 'text-danger' : 'text-subtle')}>{l.lwpDeduction ? `−${money(l.lwpDeduction)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[['Gross', totals.gross], ['Loss of pay', totals.lwp], ['Deductions', totals.deductions], ['Net payout', totals.net]].map(([k, v], i) => (
              <div key={k as string} className={cn('card p-4', i === 3 && 'bg-primary-soft')}><p className="text-xs font-semibold text-subtle">{k}</p><p className={cn('num mt-1 text-2xl font-extrabold', i === 3 && 'text-primary-ink')}>{money(v as number)}</p></div>
            ))}
          </div>
          <Card title={`${label} · ${lines.length} payslips`} bodyClass="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-y border-line bg-surface-2 text-right text-xs font-bold uppercase tracking-wider text-subtle"><th className="px-5 py-2.5 text-left">Employee</th><th className="px-3 py-2.5">Gross</th><th className="px-3 py-2.5">LWP</th><th className="px-3 py-2.5">PF</th><th className="px-3 py-2.5">ESI</th><th className="px-3 py-2.5">PT</th><th className="px-3 py-2.5">TDS</th><th className="px-5 py-2.5">Net</th></tr></thead>
                <tbody className="num">
                  {lines.map((l) => (
                    <tr key={l.empId} className="border-b border-line text-right">
                      <td className="px-5 py-2.5 text-left"><Person emp={map.get(l.empId)} size={28} link={false} /></td>
                      <td className="px-3">{money(l.gross)}</td><td className="px-3 text-danger">{l.lwpDeduction ? `−${money(l.lwpDeduction)}` : '—'}</td>
                      <td className="px-3">{l.pf ? money(l.pf) : '—'}</td><td className="px-3">{l.esi ? money(l.esi) : '—'}</td><td className="px-3">{l.pt ? money(l.pt) : '—'}</td><td className="px-3">{l.tds ? money(l.tds) : '—'}</td>
                      <td className="px-5 font-bold">{money(l.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => (step === 0 ? nav('/payroll') : setStep(step - 1))}>{step === 0 ? 'Cancel' : 'Back'}</Button>
        {step < 2
          ? <Button variant="primary" disabled={!!periodError || lines.length === 0} iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => setStep(step + 1)}>Continue</Button>
          : <Button variant="primary" size="lg" loading={busy} icon={<Check className="h-4 w-4" />} onClick={process}>Process payroll · {money(totals.net)}</Button>}
      </div>
    </div>
  )
}
