import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlarmClock, CalendarRange, ChevronLeft, ChevronRight, Download, ExternalLink, Globe, LayoutList, MapPin, Pencil, ScanFace, Timer, Navigation,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { attendanceForDay, lastWorkingDay, type DayState } from '@/data/selectors'
import type { AttendanceRecord, Employee } from '@/data/types'
import { addDays, cn, downloadFile, eachDay, endOfMonth, fmtDate, fmtDay, fmtMins, fmtTime, isSunday, monthName, parseISO, startOfMonth, toCSV, today, toISO, toMins } from '@/lib/utils'
import {
  Badge, Button, DataTable, Drawer, EmptyState, Field, IconButton, Input, Modal, PageHeader, Person, SearchInput, Select, StatusBadge, Tabs, Textarea,
  Toolbar, toast, type Column,
} from '@/components/ui'

type Row = ReturnType<typeof attendanceForDay>[number]
const FILTERS: { value: DayState | 'all' | 'in'; label: string; tone: string }[] = [
  { value: 'all', label: 'Everyone', tone: 'bg-surface-3 text-ink' },
  { value: 'in', label: 'Checked in', tone: 'bg-accent-soft text-accent-ink' },
  { value: 'late', label: 'Late', tone: 'bg-primary-soft text-primary-ink' },
  { value: 'not-in', label: 'Not in yet', tone: 'bg-surface-3 text-muted' },
  { value: 'absent', label: 'Absent', tone: 'bg-danger-soft text-danger' },
  { value: 'leave', label: 'On leave', tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
]

export default function Attendance() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('view') ?? (params.get('filter') === 'no-checkout' ? 'missing' : 'daily')
  return (
    <>
      <PageHeader title="Attendance" subtitle="Live check-ins with GPS, face scan and activity — plus a monthly register for payroll.">
        <Tabs value={tab} onChange={(v) => setParams({ view: v }, { replace: true })} tabs={[
          { value: 'daily', label: 'Daily board', icon: <LayoutList className="h-4 w-4" /> },
          { value: 'register', label: 'Monthly register', icon: <CalendarRange className="h-4 w-4" /> },
          { value: 'missing', label: 'Missing check-outs', icon: <AlarmClock className="h-4 w-4" /> },
        ]} />
      </PageHeader>
      {tab === 'daily' && <Daily />}
      {tab === 'register' && <Register />}
      {tab === 'missing' && <MissingCheckouts />}
    </>
  )
}

function Daily() {
  const shifts = useDb((db) => db.shifts)
  const lwd = useDb((db) => lastWorkingDay(db))
  const [date, setDate] = useState(lwd)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [regularize, setRegularize] = useState<Row | null>(null)
  const { rows, holiday, departments } = useDb((db) => ({ rows: attendanceForDay(db, date), holiday: db.holidays.find((h) => h.date === date), departments: db.departments }), [date])
  const prevWorking = useDb((db) => lastWorkingDay(db, addDays(date, -1)), [date])
  const isOff = isSunday(date) || (holiday && holiday.type !== 'Optional')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, in: 0 }
    rows.forEach((r) => { c[r.state] = (c[r.state] ?? 0) + 1; if (r.rec?.checkIn) c.in!++ })
    return c
  }, [rows])
  const visible = rows.filter((r) => (filter === 'all' || (filter === 'in' ? !!r.rec?.checkIn : r.state === filter)) && (!dept || r.emp.department === dept) &&
    (!q || `${r.emp.name} ${r.emp.code}`.toLowerCase().includes(q.toLowerCase())))
  const shiftOf = (e: Employee) => shifts.find((s) => s.id === e.shiftId)
  const worked = (r?: AttendanceRecord) => r?.checkIn ? (r.checkOut ? toMins(r.checkOut) : date === today() ? new Date().getHours() * 60 + new Date().getMinutes() : toMins(r.checkIn)) - toMins(r.checkIn) - 60 : 0

  const columns: Column<Row>[] = [
    { key: 'emp', header: 'Employee', sort: (r) => r.emp.name, cell: (r) => <Person emp={r.emp} size={34} sub={r.emp.code} /> },
    {
      key: 'in', header: 'Check-in', sort: (r) => r.rec?.checkIn ?? '99',
      cell: (r) => r.rec?.checkIn ? (
        <div className="whitespace-nowrap">
          <p className={cn('num font-semibold', r.state === 'late' && 'text-primary-ink')}>{fmtTime(r.rec.checkIn)}</p>
          <p className="flex items-center gap-1 text-xs text-subtle">{r.rec.method === 'Face scan' ? <ScanFace className="h-3 w-3" /> : r.rec.method === 'GPS' ? <Navigation className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{r.rec.method}</p>
        </div>
      ) : <span className="text-subtle">—</span>,
    },
    { key: 'out', header: 'Check-out', sort: (r) => r.rec?.checkOut ?? '', cell: (r) => r.rec?.checkOut ? <span className="num font-semibold">{fmtTime(r.rec.checkOut)}</span> : r.rec?.checkIn ? <Badge tone="blue" dot>Working</Badge> : <span className="text-subtle">—</span> },
    { key: 'hours', header: 'Worked', align: 'right', sort: (r) => worked(r.rec), cell: (r) => r.rec?.checkIn ? <span className="num font-semibold">{fmtMins(Math.max(0, worked(r.rec)))}</span> : <span className="text-subtle">—</span> },
    { key: 'shift', header: 'Shift', hideBelow: 'xl', cell: (r) => { const s = shiftOf(r.emp); return s ? <span className="whitespace-nowrap text-[13px] text-muted">{s.name} · {s.start}–{s.end}</span> : null } },
    { key: 'loc', header: 'Location', hideBelow: 'lg', cell: (r) => r.rec?.location ? <span className="flex max-w-[220px] items-center gap-1.5 text-[13px] text-muted"><MapPin className="h-3.5 w-3.5 shrink-0 text-subtle" /><span className="truncate">{r.rec.location}</span></span> : <span className="text-subtle">—</span> },
    {
      key: 'active', header: 'Active', sort: (r) => r.rec?.activePct ?? -1, hideBelow: 'md',
      cell: (r) => r.rec?.activePct !== undefined ? <div className="flex w-24 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${r.rec.activePct}%` }} /></div><span className="num w-8 text-xs font-bold">{r.rec.activePct}%</span></div> : <span className="text-subtle">—</span>,
    },
    { key: 'status', header: 'Status', sort: (r) => r.state, cell: (r) => <StatusBadge status={r.state} /> },
    {
      key: 'act', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: (r) => <IconButton size="icon-sm" label={`Regularise ${r.emp.name}`} icon={<Pencil className="h-4 w-4" />} onClick={(e) => { e.stopPropagation(); setRegularize(r) }} />,
    },
  ]
  const open = rows.find((r) => r.emp.id === openId)

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <IconButton variant="secondary" label="Previous day" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setDate(addDays(date, -1))} />
          <Input type="date" className="w-44" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          <IconButton variant="secondary" label="Next day" disabled={date >= today()} icon={<ChevronRight className="h-4 w-4" />} onClick={() => setDate(addDays(date, 1))} />
          <Button variant="ghost" onClick={() => setDate(today())}>Today</Button>
          <span className="hidden text-sm font-semibold text-subtle md:inline">{fmtDay(date)}, {fmtDate(date)}</span>
        </div>
        <Button className="self-start" icon={<Download className="h-4 w-4" />} onClick={() => {
          downloadFile(`attendance-${date}.csv`, toCSV(rows.map((r) => ({ Employee: r.emp.name, Code: r.emp.code, Status: r.state, 'Check in': r.rec?.checkIn ?? '', 'Check out': r.rec?.checkOut ?? '', Location: r.rec?.location ?? '', 'Active %': r.rec?.activePct ?? '' }))))
          toast.success('Attendance exported')
        }}>Export day</Button>
      </div>

      {isOff && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm">
          <CalendarRange className="h-4 w-4 text-subtle" />
          <span className="flex-1 font-semibold">{holiday ? `${holiday.name} — company holiday.` : 'Sunday — weekly off.'} Nobody is expected in.</span>
          <Button size="sm" onClick={() => setDate(prevWorking)}>Go to previous working day</Button>
        </div>
      )}

      <div className="scroll-thin mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
            className={cn('flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-left transition-all',
              filter === f.value ? 'border-primary shadow-ring' : 'border-line bg-surface hover:border-line-strong')}>
            <span className={cn('num flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-extrabold', f.tone)}>{counts[f.value] ?? 0}</span>
            <span className="text-sm font-semibold">{f.label}</span>
          </button>
        ))}
      </div>
      <Toolbar>
        <SearchInput className="w-full sm:w-64" value={q} onChange={setQ} placeholder="Search name or ID…" />
        <Select className="w-full sm:w-48" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" options={[{ value: '', label: 'All departments' }, ...departments.map((d) => d.name)]} />
      </Toolbar>
      <DataTable rows={visible} columns={columns} rowKey={(r) => r.emp.id} onRowClick={(r) => r.rec?.checkIn && setOpenId(r.emp.id)} defaultSort={{ key: 'in', dir: 'asc' }}
        empty={<EmptyState title="No one matches" body="Try another filter." />} />

      <AttendanceDrawer row={open} date={date} onClose={() => setOpenId(null)} onRegularize={() => open && setRegularize(open)} />
      <RegularizeModal row={regularize} date={date} onClose={() => setRegularize(null)} />
    </>
  )
}

function GpsTrail({ points }: { points: [number, number][] }) {
  const w = 520, h = 220
  const pts = points.map(([x, y]) => [x * w, y * h])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full rounded-xl border border-line" role="img" aria-label="GPS trail during the day">
      <rect width={w} height={h} fill="rgb(var(--surface-2))" />
      {/* stylised streets */}
      <path d={`M0 ${h * 0.28} C ${w * 0.3} ${h * 0.2}, ${w * 0.6} ${h * 0.4}, ${w} ${h * 0.3}`} stroke="#FDE7A6" strokeWidth="14" fill="none" opacity=".8" />
      <path d={`M${w * 0.18} 0 L ${w * 0.26} ${h}`} stroke="rgb(var(--line-strong))" strokeWidth="6" fill="none" />
      <path d={`M${w * 0.72} 0 L ${w * 0.68} ${h}`} stroke="rgb(var(--line-strong))" strokeWidth="6" fill="none" />
      <path d={`M0 ${h * 0.78} L ${w} ${h * 0.7}`} stroke="rgb(var(--line-strong))" strokeWidth="5" fill="none" />
      <rect x={w * 0.36} y={h * 0.46} width={w * 0.22} height={h * 0.3} rx="6" fill="rgb(var(--line))" />
      <rect x={w * 0.76} y={h * 0.4} width={w * 0.18} height={h * 0.24} rx="6" fill="rgb(var(--line))" />
      <circle cx={pts[0]![0]} cy={pts[0]![1]} r="34" fill="#2A9CB8" opacity=".12" />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#F68713" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 0" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 || i === pts.length - 1 ? 6 : 4} fill={i === 0 ? '#2A9CB8' : '#F68713'} stroke="#fff" strokeWidth="2" />)}
      <text x={w - 8} y={h - 8} textAnchor="end" fontSize="10" fill="rgb(var(--subtle))">Geofence: 150 m · {points.length} pings</text>
    </svg>
  )
}

function AttendanceDrawer({ row, date, onClose, onRegularize }: { row?: Row; date: string; onClose: () => void; onRegularize: () => void }) {
  const shift = useDb((db) => db.shifts.find((s) => s.id === row?.emp.shiftId), [row?.emp.shiftId])
  if (!row?.rec) return null
  const r = row.rec
  const active = (r.periods ?? []).reduce((n, p) => n + p.activeMins, 0)
  const idle = (r.periods ?? []).reduce((n, p) => n + p.idleMins, 0)
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={row.emp.name} subtitle={`${fmtDay(date)}, ${fmtDate(date)} · ${row.emp.designation}`} headerExtra={<StatusBadge status={row.state} />}
      footer={<Button icon={<Pencil className="h-4 w-4" />} onClick={onRegularize}>Regularise</Button>}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-primary-soft text-center">
            <ScanFace className="h-8 w-8 text-accent-ink" />
            <span className="mt-1 text-[11px] font-bold text-muted">{r.method === 'Face scan' ? 'Face matched' : r.method}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-xs">Check-in location</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />{r.location}</p>
            <a className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-accent-ink hover:underline" href={`https://www.google.com/maps/search/${encodeURIComponent(r.location ?? '')}`} target="_blank" rel="noreferrer">Open in Maps <ExternalLink className="h-3 w-3" /></a>
            <p className="mt-2 text-xs text-subtle">Shift {shift?.name} · {shift?.start}–{shift?.end} · grace {shift?.graceMins} min</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Check-in', fmtTime(r.checkIn)], ['Check-out', r.checkOut ? fmtTime(r.checkOut) : 'Working'], ['Active', fmtMins(active)], ['Idle', fmtMins(idle)]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-subtle">{k}</p><p className="num mt-0.5 text-lg font-extrabold">{v}</p></div>
          ))}
        </div>
        {r.trail && <div><p className="label-xs mb-2">GPS trail</p><GpsTrail points={r.trail} /></div>}
        <div>
          <div className="mb-3 flex items-center justify-between"><p className="label-xs">Activity by period</p><span className="text-xs font-bold text-muted">{r.activePct}% active overall</span></div>
          <ul className="flex flex-col gap-2.5">
            {(r.periods ?? []).map((p, i) => {
              const pct = Math.round((p.activeMins / Math.max(1, p.activeMins + p.idleMins)) * 100)
              return (
                <li key={i} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-[13px]">
                  <span className="num text-muted">{fmtTime(p.from)} – {fmtTime(p.to)}</span>
                  <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} title={`${p.activeMins} min active`} />
                    <div className="h-full bg-primary/40" style={{ width: `${100 - pct}%` }} title={`${p.idleMins} min idle`} />
                  </div>
                  <span className="num text-right font-bold">{pct}%</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex gap-4 text-xs font-semibold text-muted"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-accent" />Active</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary/40" />Idle</span></div>
        </div>
        {r.note && <div className="rounded-xl bg-surface-2 p-3.5 text-sm"><p className="text-xs font-bold text-subtle">Regularisation note</p>{r.note}</div>}
      </div>
    </Drawer>
  )
}

function RegularizeModal({ row, date, onClose }: { row: Row | null; date: string; onClose: () => void }) {
  const [f, setF] = useState({ status: 'present' as AttendanceRecord['status'], checkIn: '09:00', checkOut: '18:00', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (row) { setF({ status: row.rec?.status && !['weekend', 'holiday'].includes(row.rec.status) ? row.rec.status : 'present', checkIn: row.rec?.checkIn ?? '09:00', checkOut: row.rec?.checkOut ?? '18:00', note: '' }); setErr('') }
  }, [row])
  const needsTimes = ['present', 'late', 'half-day'].includes(f.status)
  return (
    <Modal open={!!row} onClose={onClose} size="sm" title={`Regularise ${row?.emp.name}`} description={`${fmtDay(date)}, ${fmtDate(date)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => {
        if (!f.note.trim()) { setErr('Add a reason — it’s kept in the audit trail.'); return }
        if (needsTimes && f.checkOut && f.checkOut <= f.checkIn) { setErr('Check-out must be after check-in.'); return }
        setBusy(true)
        await api.attendance.regularize({ empId: row!.emp.id, date, status: f.status, checkIn: needsTimes ? f.checkIn : undefined, checkOut: needsTimes ? f.checkOut || undefined : undefined, method: row!.rec?.method ?? 'Web', location: row!.rec?.location ?? 'Regularised by admin', activePct: row!.rec?.activePct, periods: row!.rec?.periods, trail: row!.rec?.trail }, f.note)
        setBusy(false); toast.success('Attendance updated'); onClose()
      }}>Save</Button></>}>
      <div className="grid gap-4">
        <Field label="Mark as"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AttendanceRecord['status'] })} options={[{ value: 'present', label: 'Present' }, { value: 'late', label: 'Late' }, { value: 'half-day', label: 'Half day' }, { value: 'absent', label: 'Absent (LWP)' }, { value: 'leave', label: 'On leave' }]} /></Field>
        {needsTimes && <div className="grid grid-cols-2 gap-4"><Field label="Check-in"><Input type="time" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></Field><Field label="Check-out"><Input type="time" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field></div>}
        <Field label="Reason" required error={err}><Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Forgot to check out — confirmed with manager" /></Field>
      </div>
    </Modal>
  )
}

function Register() {
  const [month, setMonth] = useState(startOfMonth(today()))
  const [dept, setDept] = useState('')
  const { emps, att, holidays, departments } = useDb((db) => ({ emps: db.employees.filter((e) => e.status !== 'onboarding'), att: db.attendance, holidays: db.holidays, departments: db.departments }))
  const days = eachDay(month, endOfMonth(month))
  const m = parseISO(month)
  const byKey = useMemo(() => new Map(att.filter((a) => a.date.startsWith(month.slice(0, 7))).map((a) => [`${a.empId}|${a.date}`, a])), [att, month])
  const people = emps.filter((e) => !dept || e.department === dept)
  const code: Record<string, [string, string]> = {
    present: ['P', 'bg-accent-soft text-accent-ink'], late: ['L', 'bg-primary-soft text-primary-ink'], 'half-day': ['H', 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'],
    absent: ['A', 'bg-danger-soft text-danger'], leave: ['LV', 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'], holiday: ['HO', 'bg-surface-3 text-subtle'], weekend: ['', 'bg-surface-3/60'],
  }
  const shift = (n: number) => setMonth(toISO(new Date(m.getFullYear(), m.getMonth() + n, 1)))
  const exportCsv = () => {
    downloadFile(`register-${month.slice(0, 7)}.csv`, toCSV(people.map((e) => ({ Employee: e.name, Code: e.code, ...Object.fromEntries(days.map((d) => [d.slice(8), code[byKey.get(`${e.id}|${d}`)?.status ?? '']?.[0] ?? ''])) }))))
    toast.success('Register exported')
  }
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <h3 className="mr-auto text-[15px] font-bold">{monthName(m.getMonth(), true)} {m.getFullYear()}</h3>
        <Select className="w-44" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" options={[{ value: '', label: 'All departments' }, ...departments.map((d) => d.name)]} />
        <IconButton size="icon-sm" variant="secondary" label="Previous month" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => shift(-1)} />
        <IconButton size="icon-sm" variant="secondary" label="Next month" disabled={month >= startOfMonth(today())} icon={<ChevronRight className="h-4 w-4" />} onClick={() => shift(1)} />
        <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv}>Export</Button>
      </div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[190px] border-b border-line bg-surface px-4 py-2 text-left text-xs font-bold text-subtle">Employee</th>
              {days.map((d) => <th key={d} className={cn('min-w-[30px] border-b border-line py-2 text-center font-bold', isSunday(d) ? 'text-subtle' : 'text-muted')}><div>{'SMTWTFS'[parseISO(d).getDay()]}</div><div className="num">{parseISO(d).getDate()}</div></th>)}
              {['P', 'L', 'A', 'LV'].map((h) => <th key={h} className="min-w-[36px] border-b border-l border-line bg-surface-2 py-2 text-center font-bold text-muted">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {people.map((e) => {
              const recs = days.map((d) => byKey.get(`${e.id}|${d}`))
              const n = (s: string[]) => recs.filter((r) => r && s.includes(r.status)).length
              return (
                <tr key={e.id} className="group">
                  <td className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-1.5 group-hover:bg-surface-2"><Person emp={e} size={24} sub={e.code} /></td>
                  {days.map((d, i) => {
                    const r = recs[i]
                    const [c, cls] = r ? code[r.status] ?? ['', ''] : holidays.some((h) => h.date === d) ? code.holiday! : ['', '']
                    return <td key={d} className="border-b border-line p-0.5"><div title={r ? `${fmtDate(d)}: ${r.status}${r.checkIn ? ` ${r.checkIn}–${r.checkOut ?? ''}` : ''}` : fmtDate(d)} className={cn('flex h-6 items-center justify-center rounded font-bold', cls)}>{c}</div></td>
                  })}
                  {[n(['present', 'half-day']), n(['late']), n(['absent']), n(['leave'])].map((v, i) => <td key={i} className="num border-b border-l border-line bg-surface-2 text-center text-xs font-bold">{v}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-line px-5 py-3 text-xs font-semibold text-muted">
        {Object.entries({ P: 'Present', L: 'Late', H: 'Half day', A: 'Absent', LV: 'Leave', HO: 'Holiday' }).map(([k, v]) => <span key={k}><b className="text-ink">{k}</b> {v}</span>)}
      </div>
    </div>
  )
}

function MissingCheckouts() {
  const { recs, map } = useDb((db) => ({
    recs: db.attendance.filter((a) => a.date < today() && a.date >= addDays(today(), -14) && a.checkIn && !a.checkOut).sort((a, b) => b.date.localeCompare(a.date)),
    map: new Map(db.employees.map((e) => [e.id, e])),
  }))
  const fix = async (r: AttendanceRecord) => { await api.attendance.regularize({ ...r, checkOut: '18:00' }, 'Auto-closed at shift end by admin'); toast.success(`Closed ${map.get(r.empId)?.name}'s day at 6:00 PM`) }
  return (
    <DataTable rows={recs} rowKey={(r) => r.id} columns={[
      { key: 'emp', header: 'Employee', cell: (r) => <Person emp={map.get(r.empId)} size={32} /> },
      { key: 'date', header: 'Date', sort: (r) => r.date, cell: (r) => <span className="num font-semibold">{fmtDay(r.date)}, {fmtDate(r.date)}</span> },
      { key: 'in', header: 'Checked in', cell: (r) => <span className="num">{fmtTime(r.checkIn)}</span> },
      { key: 'act', header: <span className="sr-only">Actions</span>, align: 'right', cell: (r) => <Button size="sm" icon={<Timer className="h-3.5 w-3.5" />} onClick={() => fix(r)}>Close at shift end</Button> },
    ]} empty={<EmptyState icon={<AlarmClock className="h-5 w-5" />} title="No missing check-outs" body="Every day in the last two weeks has a check-out. 👏" />} />
  )
}
