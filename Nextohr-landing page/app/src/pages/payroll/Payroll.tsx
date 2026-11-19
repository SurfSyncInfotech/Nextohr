import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, CalendarClock, Pencil, RefreshCw, Save, Trash2, Wallet } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap } from '@/data/selectors'
import type { SalaryStructure, StatutorySettings } from '@/data/types'
import { deductions, grossOf, runTotals } from '@/lib/payroll'
import { compactMoney, fmtDate, money, monthName, parseISO, today } from '@/lib/utils'
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, EmptyState, Field, IconButton, Input, Modal, PageHeader, Person, SearchInput, Select,
  Stat, StatusBadge, Switch, Tabs, Toolbar, toast, type Column,
} from '@/components/ui'

type Tab = 'runs' | 'structures' | 'settings'

export default function Payroll() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'runs'
  const missing = useDb((db) => db.salaries.filter((s) => s.basic === 0 && db.employees.find((e) => e.id === s.empId && e.status !== 'inactive')).length)
  return (
    <>
      <PageHeader title="Payroll" subtitle="India statutory payroll — EPF, ESI, professional tax, TDS and payslips.">
        <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[
          { value: 'runs', label: 'Pay runs' }, { value: 'structures', label: 'Salary structures', count: missing }, { value: 'settings', label: 'Statutory settings' },
        ]} />
      </PageHeader>
      {tab === 'runs' && <Runs />}
      {tab === 'structures' && <Structures editId={params.get('edit')} />}
      {tab === 'settings' && <Statutory />}
    </>
  )
}

function Runs() {
  const nav = useNavigate()
  const { runs, active, missing } = useDb((db) => ({ runs: db.payrollRuns, active: db.salaries.filter((s) => s.basic > 0).length, missing: db.salaries.filter((s) => s.basic === 0).length }))
  const [del, setDel] = useState<string | null>(null)
  const t = parseISO(today())
  const covered = runs.some((r) => r.from.startsWith(today().slice(0, 7)))
  const nextLabel = `${monthName(t.getMonth(), true)} ${t.getFullYear()}`
  const ytd = runs.filter((r) => r.from.startsWith(today().slice(0, 4))).reduce((n, r) => n + runTotals(r.lines).gross, 0)
  const last = runs[0] ? runTotals(runs[0].lines) : undefined

  return (
    <>
      <section className="card relative mb-6 overflow-hidden p-6">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-primary/10" aria-hidden />
        <div className="absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-accent/10" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary"><CalendarClock className="h-7 w-7" /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-subtle">{covered ? 'Up to date' : 'Next pay run'}</p>
            <h2 className="text-2xl font-extrabold tracking-tight">{covered ? `${nextLabel} payroll is processed` : `${nextLabel} payroll`}</h2>
            <p className="mt-1 text-sm text-muted">{active} people with salary structures{missing ? <> · <b className="text-primary-ink">{missing} missing a structure</b></> : ''}. LWP is pulled from attendance and unpaid leave automatically.</p>
          </div>
          <Button size="lg" variant="primary" iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => nav('/payroll/run')}>{covered ? 'Run another period' : 'Start pay run'}</Button>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Last net payout" value={last ? compactMoney(last.net) : '—'} icon={<Wallet className="h-4 w-4" />} footnote={runs[0]?.label} />
        <Stat label="Last gross" value={last ? compactMoney(last.gross) : '—'} tone="blue" icon={<Wallet className="h-4 w-4" />} footnote={last ? `${compactMoney(last.deductions)} deductions` : ''} />
        <Stat label="Gross paid this year" value={compactMoney(ytd)} tone="success" icon={<Wallet className="h-4 w-4" />} footnote={`${runs.filter((r) => r.from.startsWith(today().slice(0, 4))).length} runs`} />
      </div>

      <DataTable rows={runs} rowKey={(r) => r.id} onRowClick={(r) => nav(`/payroll/runs/${r.id}`)} columns={[
        { key: 'label', header: 'Period', cell: (r) => <div><p className="font-bold">{r.label}</p><p className="text-xs text-subtle">{fmtDate(r.from)} – {fmtDate(r.to)}</p></div> },
        { key: 'people', header: 'People', align: 'right', cell: (r) => <span className="num font-semibold">{r.lines.length}</span> },
        { key: 'gross', header: 'Gross', align: 'right', cell: (r) => <span className="num">{money(runTotals(r.lines).gross)}</span>, hideBelow: 'md' },
        { key: 'ded', header: 'Deductions', align: 'right', cell: (r) => <span className="num text-muted">{money(runTotals(r.lines).deductions)}</span>, hideBelow: 'lg' },
        { key: 'net', header: 'Net pay', align: 'right', cell: (r) => <span className="num font-bold">{money(runTotals(r.lines).net)}</span> },
        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
        {
          key: 'act', header: <span className="sr-only">Actions</span>, align: 'right',
          cell: (r) => (
            <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              {r.status === 'processed' && <Button size="sm" variant="success" onClick={async () => { await api.payroll.markPaid(r.id); toast.success(`${r.label} marked as paid`, { body: 'Payslips are now visible to employees.' }) }}>Mark paid</Button>}
              {r.status !== 'paid' && <IconButton size="icon-sm" label="Delete run" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(r.id)} />}
            </div>
          ),
        },
      ]} empty={<EmptyState icon={<Wallet className="h-5 w-5" />} title="No pay runs yet" body="Start your first pay run above." />} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete this pay run?" body="Unpaid runs can be deleted and re-run. Payslips from this run will be removed."
        onConfirm={async () => { await api.payroll.removeRun(del!); setDel(null); toast.success('Pay run deleted') }} />
    </>
  )
}

function Structures({ editId }: { editId: string | null }) {
  const { salaries, map, statutory } = useDb((db) => ({ salaries: db.salaries.filter((s) => db.employees.find((e) => e.id === s.empId && e.status !== 'inactive')), map: empMap(db), statutory: db.statutory }))
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<SalaryStructure | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [, setParams] = useSearchParams()
  useEffect(() => { if (editId) { const s = salaries.find((x) => x.empId === editId); if (s) setEditing(s) } }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = salaries.filter((s) => !q || map.get(s.empId)?.name.toLowerCase().includes(q.toLowerCase()))
  const missing = rows.filter((s) => s.basic === 0)

  const columns: Column<SalaryStructure>[] = [
    { key: 'emp', header: 'Employee', sort: (s) => map.get(s.empId)?.name ?? '', cell: (s) => <Person emp={map.get(s.empId)} size={32} /> },
    { key: 'basic', header: 'Basic', align: 'right', sort: (s) => s.basic, hideBelow: 'md', cell: (s) => <span className="num">{money(s.basic)}</span> },
    { key: 'hra', header: 'HRA', align: 'right', hideBelow: 'lg', cell: (s) => <span className="num">{money(s.hra)}</span> },
    { key: 'gross', header: 'Gross', align: 'right', sort: (s) => grossOf(s), cell: (s) => <span className="num font-bold">{money(grossOf(s))}</span> },
    { key: 'ded', header: 'Deductions', align: 'right', hideBelow: 'lg', cell: (s) => <span className="num text-muted">{money(deductions(s, statutory).total)}</span> },
    { key: 'net', header: 'In-hand', align: 'right', sort: (s) => deductions(s, statutory).net, cell: (s) => <span className="num font-bold text-success">{money(deductions(s, statutory).net)}</span> },
    {
      key: 'stat', header: 'Statutory', hideBelow: 'xl',
      cell: (s) => { const d = deductions(s, statutory); return <div className="flex flex-wrap gap-1">{d.pf > 0 && <Badge tone="blue">PF {money(d.pf)}</Badge>}{d.esi > 0 && <Badge tone="violet">ESI</Badge>}{d.tds > 0 && <Badge tone="orange">TDS</Badge>}{!d.pf && !d.esi && !d.tds && <span className="text-subtle">—</span>}</div> },
    },
    { key: 'act', header: <span className="sr-only">Actions</span>, align: 'right', cell: (s) => s.basic === 0 ? <Button size="sm" variant="primary" onClick={() => setEditing(s)}>Add structure</Button> : <IconButton size="icon-sm" label="Edit structure" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(s)} /> },
  ]

  return (
    <>
      {missing.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-primary-ink" />
          <span className="flex-1 font-semibold">{missing.length} {missing.length === 1 ? 'person has' : 'people have'} no salary structure and will be skipped in payroll.</span>
          <Button size="sm" loading={syncing} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={async () => { setSyncing(true); const n = await api.payroll.syncFromOffers(); setSyncing(false); toast.success(n ? `${n} structures filled from offer letters` : 'No matching offer letters to sync') }}>Fill from offer letters</Button>
        </div>
      )}
      <Toolbar><SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search employee…" /></Toolbar>
      <DataTable rows={rows} columns={columns} rowKey={(s) => s.empId} defaultSort={{ key: 'gross', dir: 'desc' }} />
      <SalaryModal value={editing} onClose={() => { setEditing(null); setParams({ tab: 'structures' }, { replace: true }) }} />
    </>
  )
}

function SalaryModal({ value, onClose }: { value: SalaryStructure | null; onClose: () => void }) {
  const { emp, statutory } = useDb((db) => ({ emp: db.employees.find((e) => e.id === value?.empId), statutory: db.statutory }), [value?.empId])
  const [s, setS] = useState<SalaryStructure | null>(null)
  const [mode, setMode] = useState<'split' | 'gross'>('split')
  const [grossInput, setGrossInput] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (value) { setS(value); setGrossInput(grossOf(value)); setMode(value.basic ? 'split' : 'gross') } }, [value])
  const preview = useMemo(() => (s ? deductions(s, statutory) : null), [s, statutory])
  if (!s) return null
  const fromGross = (g: number) => { const basic = Math.round(g * 0.5); const hra = Math.round(basic * 0.4); setS({ ...s, basic, hra, special: g - basic - hra, pfEnabled: s.pfEnabled || g > 0 }) }
  return (
    <Modal open={!!value} onClose={onClose} title={`Salary — ${emp?.name}`} description={emp?.designation} icon={<Wallet className="h-5 w-5" />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={s.basic <= 0} onClick={async () => { setBusy(true); await api.payroll.saveSalary(s); setBusy(false); toast.success('Salary structure saved'); onClose() }}>Save structure</Button></>}>
      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={mode === 'gross' ? 'soft' : 'ghost'} onClick={() => setMode('gross')}>Start from gross</Button>
        <Button size="sm" variant={mode === 'split' ? 'soft' : 'ghost'} onClick={() => setMode('split')}>Enter components</Button>
      </div>
      {mode === 'gross' ? (
        <Field label="Monthly gross (₹)" hint="We split it 50% basic, 40% of basic as HRA, rest as special allowance. Switch to components to fine-tune.">
          <Input type="number" min={0} value={grossInput} onChange={(e) => { const g = Number(e.target.value); setGrossInput(g); fromGross(g) }} />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Basic"><Input type="number" min={0} value={s.basic} onChange={(e) => setS({ ...s, basic: Number(e.target.value) })} /></Field>
          <Field label="HRA"><Input type="number" min={0} value={s.hra} onChange={(e) => setS({ ...s, hra: Number(e.target.value) })} /></Field>
          <Field label="Special allowance"><Input type="number" min={0} value={s.special} onChange={(e) => setS({ ...s, special: Number(e.target.value) })} /></Field>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Monthly TDS (₹)" hint={statutory.tdsEnabled ? 'From their tax declaration' : 'TDS is off in statutory settings'}><Input type="number" min={0} value={s.tdsMonthly} onChange={(e) => setS({ ...s, tdsMonthly: Number(e.target.value) })} /></Field>
        <Field label="Other deductions (₹)" hint="Loans, advances, etc."><Input type="number" min={0} value={s.otherDeductions} onChange={(e) => setS({ ...s, otherDeductions: Number(e.target.value) })} /></Field>
        <Field label="Effective from"><Input type="date" value={s.effectiveFrom} onChange={(e) => setS({ ...s, effectiveFrom: e.target.value })} /></Field>
        <div className="flex items-end pb-2"><Checkbox checked={s.pfEnabled} onChange={(v) => setS({ ...s, pfEnabled: v })} label="Deduct provident fund" /></div>
      </div>
      {preview && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-4 text-sm sm:grid-cols-4">
          {[['Gross', preview.gross], ['PF', preview.pf], ['ESI + PT', preview.esi + preview.pt], ['TDS', preview.tds]].map(([k, v]) => <div key={k as string}><p className="text-xs text-subtle">{k}</p><p className="num font-bold">{money(v as number)}</p></div>)}
          <div className="col-span-2 mt-2 flex items-center justify-between rounded-xl bg-success-soft px-3 py-2 sm:col-span-4"><span className="font-bold text-success">Monthly in-hand</span><span className="num text-lg font-extrabold text-success">{money(preview.net)}</span></div>
        </div>
      )}
    </Modal>
  )
}

const PT_STATES = ['Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Telangana', 'Andhra Pradesh', 'Madhya Pradesh', 'Delhi']

function Statutory() {
  const saved = useDb((db) => db.statutory)
  const [s, setS] = useState<StatutorySettings>(saved)
  const [busy, setBusy] = useState(false)
  useEffect(() => setS(saved), [saved])
  const dirty = JSON.stringify(s) !== JSON.stringify(saved)
  const num = (k: keyof StatutorySettings) => (e: { target: { value: string } }) => setS({ ...s, [k]: Number(e.target.value) })
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Provident fund (EPF)" action={<Switch checked={s.pfEnabled} onChange={(v) => setS({ ...s, pfEnabled: v })} />}>
        <fieldset disabled={!s.pfEnabled} className="grid gap-4 disabled:opacity-50 sm:grid-cols-3">
          <Field label="Employee %"><Input type="number" step="0.01" value={s.pfEmployeePct} onChange={num('pfEmployeePct')} /></Field>
          <Field label="Employer %"><Input type="number" step="0.01" value={s.pfEmployerPct} onChange={num('pfEmployerPct')} /></Field>
          <Field label="Wage ceiling (₹)"><Input type="number" value={s.pfWageCeiling} onChange={num('pfWageCeiling')} /></Field>
          <Checkbox className="sm:col-span-3" checked={s.pfUseCeiling} onChange={(v) => setS({ ...s, pfUseCeiling: v })} label="Cap PF wages at the ceiling" description="Statutory default. Untick to calculate on full basic." />
        </fieldset>
      </Card>
      <Card title="Employees’ State Insurance (ESI)" action={<Switch checked={s.esiEnabled} onChange={(v) => setS({ ...s, esiEnabled: v })} />}>
        <fieldset disabled={!s.esiEnabled} className="grid gap-4 disabled:opacity-50 sm:grid-cols-3">
          <Field label="Employee %"><Input type="number" step="0.01" value={s.esiEmployeePct} onChange={num('esiEmployeePct')} /></Field>
          <Field label="Employer %"><Input type="number" step="0.01" value={s.esiEmployerPct} onChange={num('esiEmployerPct')} /></Field>
          <Field label="Gross limit (₹)" hint="Applies to gross ≤ limit"><Input type="number" value={s.esiGrossLimit} onChange={num('esiGrossLimit')} /></Field>
        </fieldset>
      </Card>
      <Card title="Professional tax" action={<Switch checked={s.ptEnabled} onChange={(v) => setS({ ...s, ptEnabled: v })} />}>
        <fieldset disabled={!s.ptEnabled} className="grid gap-4 disabled:opacity-50 sm:grid-cols-2">
          <Field label="State"><Select value={s.ptState} onChange={(e) => setS({ ...s, ptState: e.target.value })} options={PT_STATES} /></Field>
          <Field label="Override (₹ / month)" hint="Leave blank to use state slabs"><Input type="number" value={s.ptOverride ?? ''} onChange={(e) => setS({ ...s, ptOverride: e.target.value ? Number(e.target.value) : undefined })} placeholder="Auto from slabs" /></Field>
        </fieldset>
      </Card>
      <Card title="TDS & payslips">
        <div className="flex flex-col gap-4">
          <Switch checked={s.tdsEnabled} onChange={(v) => setS({ ...s, tdsEnabled: v })} label="Deduct TDS" description="Uses the monthly TDS set on each salary structure." />
          <Switch checked={s.showEmployerOnPayslip} onChange={(v) => setS({ ...s, showEmployerOnPayslip: v })} label="Show employer PF / ESI on payslips" />
          <Field label="Pay day" hint="Day of the following month salaries are credited"><Input type="number" min={1} max={28} value={s.payDay} onChange={num('payDay')} /></Field>
        </div>
      </Card>
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 lg:col-span-2">
        {dirty && <span className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-muted shadow-card">You have unsaved changes</span>}
        {dirty && <Button onClick={() => setS(saved)}>Discard</Button>}
        <Button variant="primary" disabled={!dirty} loading={busy} icon={<Save className="h-4 w-4" />} onClick={async () => { setBusy(true); await api.payroll.saveStatutory(s); setBusy(false); toast.success('Statutory settings saved', { body: 'Applies from the next pay run.' }) }}>Save settings</Button>
      </div>
      <p className="text-xs text-subtle lg:col-span-2">Changes apply to future pay runs only. <Link to="/payroll" className="font-semibold text-accent-ink">Processed runs</Link> keep the values they were calculated with.</p>
    </div>
  )
}
