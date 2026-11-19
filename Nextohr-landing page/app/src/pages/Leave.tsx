import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap, leaveBalance } from '@/data/selectors'
import type { LeaveRequest, LeaveType } from '@/data/types'
import { cn, eachDay, endOfMonth, fmtRange, fmtShort, isSunday, monthName, parseISO, startOfMonth, today, toISO } from '@/lib/utils'
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, Dot, EmptyState, Field, IconButton, Input, Modal, PageHeader, Person, SearchInput,
  Segmented, Select, StatusBadge, Tabs, Textarea, Toolbar, toast, type Column,
} from '@/components/ui'

type Tab = 'requests' | 'calendar' | 'balances' | 'policies'

export default function Leave() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'requests'
  const [logOpen, setLogOpen] = useState(params.get('log') === '1')
  const pending = useDb((db) => db.leaves.filter((l) => l.status === 'pending').length)
  useEffect(() => { if (params.get('log') === '1') { setLogOpen(true); params.delete('log'); setParams(params, { replace: true }) } }, [params, setParams])

  return (
    <>
      <PageHeader title="Leave" subtitle="Requests, team calendar, balances and leave policies in one place."
        actions={<Button variant="primary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setLogOpen(true)}>Log leave</Button>}>
        <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[
          { value: 'requests', label: 'Requests', count: pending }, { value: 'calendar', label: 'Team calendar' },
          { value: 'balances', label: 'Balances' }, { value: 'policies', label: 'Leave types' },
        ]} />
      </PageHeader>
      {tab === 'requests' && <Requests />}
      {tab === 'calendar' && <LeaveCalendar />}
      {tab === 'balances' && <Balances />}
      {tab === 'policies' && <Policies />}
      <LogLeaveModal open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  )
}

export function DecisionModal({ open, onClose, ids, decision, onDone }: { open: boolean; onClose: () => void; ids: string[]; decision: 'approved' | 'rejected'; onDone?: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setNote('') }, [open])
  return (
    <Modal open={open} onClose={onClose} size="sm" title={`${decision === 'approved' ? 'Approve' : 'Reject'} ${ids.length > 1 ? `${ids.length} requests` : 'leave request'}`}
      footer={<><Button onClick={onClose}>Cancel</Button>
        <Button variant={decision === 'approved' ? 'success' : 'danger'} loading={busy} onClick={async () => {
          if (decision === 'rejected' && !note.trim()) return
          setBusy(true); await api.leaves.decide(ids, decision, note.trim() || undefined); setBusy(false)
          toast.success(`${ids.length > 1 ? `${ids.length} requests` : 'Request'} ${decision}`, { body: 'The employee has been notified.' }); onDone?.(); onClose()
        }}>{decision === 'approved' ? 'Approve' : 'Reject'}</Button></>}>
      <Field label={decision === 'approved' ? 'Note to employee (optional)' : 'Reason for rejecting'} required={decision === 'rejected'}
        hint={decision === 'rejected' ? 'Shared with the employee so they can re-plan.' : undefined}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={decision === 'approved' ? 'e.g. Get well soon!' : 'e.g. Release week — could you move this by a few days?'} autoFocus />
      </Field>
    </Modal>
  )
}

function Requests() {
  const { leaves, map, types } = useDb((db) => ({ leaves: db.leaves, map: empMap(db), types: new Map(db.leaveTypes.map((t) => [t.id, t])) }))
  const [status, setStatus] = useState<'pending' | 'all' | 'approved' | 'rejected' | 'cancelled'>('pending')
  const [q, setQ] = useState('')
  const [typeId, setTypeId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [decision, setDecision] = useState<{ ids: string[]; d: 'approved' | 'rejected' } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const counts = useMemo(() => ({
    pending: leaves.filter((l) => l.status === 'pending').length, approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length, cancelled: leaves.filter((l) => l.status === 'cancelled').length, all: leaves.length,
  }), [leaves])
  const rows = useMemo(() => leaves.filter((l) => {
    const e = map.get(l.empId)
    return (status === 'all' || l.status === status) && (!typeId || l.typeId === typeId) && (!from || l.to >= from) && (!to || l.from <= to)
      && (!q || `${e?.name} ${l.reason}`.toLowerCase().includes(q.toLowerCase()))
  }), [leaves, map, status, typeId, from, to, q])

  const columns: Column<LeaveRequest>[] = [
    { key: 'emp', header: 'Employee', sort: (l) => map.get(l.empId)?.name ?? '', cell: (l) => <Person emp={map.get(l.empId)} sub={map.get(l.empId)?.department} /> },
    { key: 'type', header: 'Type', cell: (l) => { const t = types.get(l.typeId); return <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium"><Dot color={t?.color ?? '#999'} />{t?.name}</span> } },
    { key: 'dates', header: 'Dates', sort: (l) => l.from, cell: (l) => <div className="whitespace-nowrap"><p className="font-semibold">{fmtRange(l.from, l.to)}</p><p className="text-xs text-subtle">{l.days} day{l.days > 1 ? 's' : ''} · applied {fmtShort(l.appliedOn)}</p></div> },
    {
      key: 'reason', header: 'Reason', hideBelow: 'lg',
      cell: (l) => (
        <button className="max-w-[340px] text-left text-[13px] text-muted" onClick={(e) => { e.stopPropagation(); setExpanded(expanded === l.id ? null : l.id) }}>
          <span className={cn(expanded !== l.id && 'line-clamp-2')}>{l.reason}</span>
          {l.adminNote && <span className="mt-1 block text-xs font-semibold text-subtle">Note: {l.adminNote}</span>}
        </button>
      ),
    },
    { key: 'status', header: 'Status', cell: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'act', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: (l) => l.status === 'pending' ? (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: [l.id], d: 'approved' })}>Approve</Button>
          <IconButton size="icon-sm" variant="secondary" label="Reject" icon={<X className="h-4 w-4" />} onClick={() => setDecision({ ids: [l.id], d: 'rejected' })} />
        </div>
      ) : l.status === 'approved' && l.from > today() ? (
        <Button size="sm" variant="ghost" onClick={async () => { await api.leaves.decide([l.id], 'cancelled', 'Cancelled by admin'); toast.success('Leave cancelled') }}>Cancel</Button>
      ) : null,
    },
  ]

  return (
    <>
      <Toolbar>
        <Segmented value={status} onChange={(v) => { setStatus(v); setSelected([]) }} options={[
          { value: 'pending', label: 'Pending', count: counts.pending }, { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'rejected', label: 'Rejected', count: counts.rejected }, { value: 'cancelled', label: 'Cancelled', count: counts.cancelled }, { value: 'all', label: 'All', count: counts.all },
        ]} />
      </Toolbar>
      <Toolbar>
        <SearchInput className="w-full sm:w-64" value={q} onChange={setQ} placeholder="Search employee or reason…" />
        <Select className="w-full sm:w-44" value={typeId} onChange={(e) => setTypeId(e.target.value)} aria-label="Leave type" options={[{ value: '', label: 'All leave types' }, ...[...types.values()].map((t) => ({ value: t.id, label: t.name }))]} />
        <Input type="date" className="w-full sm:w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" className="w-full sm:w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        {(from || to || typeId || q) && <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setTypeId(''); setQ('') }}>Reset</Button>}
      </Toolbar>
      <DataTable rows={rows} columns={columns} rowKey={(l) => l.id} defaultSort={{ key: 'dates', dir: status === 'pending' ? 'asc' : 'desc' }}
        selectable={status === 'pending'} selected={selected} onSelectedChange={setSelected}
        bulkActions={<>
          <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: selected, d: 'approved' })}>Approve all</Button>
          <Button size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: selected, d: 'rejected' })}>Reject</Button>
        </>}
        empty={<EmptyState title={status === 'pending' ? 'No pending requests' : 'No requests found'} body={status === 'pending' ? 'You’re all caught up.' : 'Try another filter.'} />} />
      <DecisionModal open={!!decision} onClose={() => setDecision(null)} ids={decision?.ids ?? []} decision={decision?.d ?? 'approved'} onDone={() => setSelected([])} />
    </>
  )
}

function LeaveCalendar() {
  const [month, setMonth] = useState(startOfMonth(today()))
  const [dept, setDept] = useState('')
  const { leaves, emps, types, holidays, departments } = useDb((db) => ({
    leaves: db.leaves.filter((l) => l.status === 'approved' || l.status === 'pending'),
    emps: db.employees.filter((e) => e.status !== 'inactive'), types: new Map(db.leaveTypes.map((t) => [t.id, t])),
    holidays: db.holidays, departments: db.departments,
  }))
  const days = eachDay(month, endOfMonth(month))
  const m = parseISO(month)
  const people = emps.filter((e) => !dept || e.department === dept)
  const shift = (n: number) => setMonth(toISO(new Date(m.getFullYear(), m.getMonth() + n, 1)))

  return (
    <Card title={`${monthName(m.getMonth(), true)} ${m.getFullYear()}`} subtitle="Approved and pending leave across the team. Hover a cell for details."
      action={<div className="flex flex-wrap items-center gap-2">
        <Select className="w-44" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" options={[{ value: '', label: 'All departments' }, ...departments.map((d) => d.name)]} />
        <Button size="sm" onClick={() => setMonth(startOfMonth(today()))}>Today</Button>
        <IconButton size="icon-sm" variant="secondary" label="Previous month" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => shift(-1)} />
        <IconButton size="icon-sm" variant="secondary" label="Next month" icon={<ChevronRight className="h-4 w-4" />} onClick={() => shift(1)} />
      </div>} bodyClass="px-0 pb-0">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[180px] border-b border-line bg-surface px-4 py-2 text-left font-bold text-subtle">Employee</th>
              {days.map((d) => {
                const hol = holidays.find((h) => h.date === d)
                return (
                  <th key={d} title={hol?.name} className={cn('min-w-[30px] border-b border-line px-0.5 py-2 text-center font-bold', isSunday(d) || hol ? 'bg-surface-3 text-subtle' : 'text-muted', d === today() && 'text-primary-ink')}>
                    <div>{'SMTWTFS'[parseISO(d).getDay()]}</div><div className="num">{parseISO(d).getDate()}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {people.map((e) => (
              <tr key={e.id} className="group">
                <td className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-1.5 group-hover:bg-surface-2"><Person emp={e} size={26} sub={e.department} /></td>
                {days.map((d) => {
                  const l = leaves.find((x) => x.empId === e.id && d >= x.from && d <= x.to)
                  const t = l ? types.get(l.typeId) : undefined
                  const off = isSunday(d) || holidays.some((h) => h.date === d && h.type !== 'Optional')
                  return (
                    <td key={d} className={cn('border-b border-line p-0.5 text-center', off && 'bg-surface-3/70')}>
                      {l && !off && (
                        <div title={`${e.name} — ${t?.name} (${l.status})`} className="mx-auto h-6 rounded-md" style={{ background: t?.color, opacity: l.status === 'pending' ? 0.4 : 0.9, backgroundImage: l.status === 'pending' ? 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.5) 4px 7px)' : undefined }} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-3 text-xs font-semibold text-muted">
        {[...types.values()].map((t) => <span key={t.id} className="inline-flex items-center gap-1.5"><Dot color={t.color} />{t.name}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-surface-3" />Weekly off / holiday</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded" style={{ background: '#2A9CB8', opacity: .4, backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.5) 4px 7px)' }} />Pending</span>
      </div>
    </Card>
  )
}

function Balances() {
  const data = useDb((db) => ({ rows: db.employees.filter((e) => e.status !== 'inactive').map((e) => ({ emp: e, bal: leaveBalance(db, e.id) })), types: db.leaveTypes.filter((t) => t.active && t.daysPerYear > 0) }))
  const [q, setQ] = useState('')
  const rows = data.rows.filter((r) => r.emp.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <Toolbar><SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search employee…" /></Toolbar>
      <DataTable rows={rows} rowKey={(r) => r.emp.id} columns={[
        { key: 'emp', header: 'Employee', sort: (r) => r.emp.name, cell: (r) => <Person emp={r.emp} /> },
        ...data.types.map((t): Column<(typeof rows)[number]> => ({
          key: t.id, header: t.code, align: 'center', sort: (r) => r.bal.find((b) => b.type.id === t.id)?.left ?? 0,
          cell: (r) => { const b = r.bal.find((x) => x.type.id === t.id)!; return <span className={cn('num font-bold', b.left / b.total < 0.25 ? 'text-danger' : 'text-ink')}>{b.left}<span className="font-medium text-subtle"> / {b.total}</span></span> },
        })),
        { key: 'used', header: 'Used this year', align: 'right', sort: (r) => r.bal.reduce((n, b) => n + b.used, 0), cell: (r) => <span className="num font-semibold">{r.bal.reduce((n, b) => n + b.used, 0)} days</span> },
      ]} />
    </>
  )
}

function Policies() {
  const types = useDb((db) => db.leaveTypes)
  const [edit, setEdit] = useState<Partial<LeaveType> | null>(null)
  const [del, setDel] = useState<LeaveType | null>(null)
  return (
    <>
      <div className="mb-3 flex justify-end"><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ name: '', code: '', daysPerYear: 12, paid: true, carryForward: false, active: true, color: '#2A9CB8' })}>Add leave type</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {types.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ background: t.color }}>{t.code}</span>
              <div className="min-w-0 flex-1"><p className="font-bold">{t.name}</p><p className="text-sm text-subtle">{t.daysPerYear ? `${t.daysPerYear} days / year` : 'Granted as needed'}</p></div>
              <StatusBadge status={t.active ? 'active' : 'inactive'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone={t.paid ? 'success' : 'neutral'}>{t.paid ? 'Paid' : 'Unpaid'}</Badge>
              {t.carryForward && <Badge tone="blue">Carries forward</Badge>}
            </div>
            <div className="mt-4 flex gap-2 border-t border-line pt-3">
              <Button size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(t)}>Edit</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(t)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      <LeaveTypeModal value={edit} onClose={() => setEdit(null)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete ${del?.name}?`} body="Existing requests keep their history, but employees can no longer apply for this type."
        onConfirm={async () => { await api.leaveTypes.remove(del!.id); setDel(null); toast.success('Leave type deleted') }} />
    </>
  )
}

export function LeaveTypeModal({ value, onClose }: { value: Partial<LeaveType> | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<LeaveType>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (value) { setF(value); setErr('') } }, [value])
  return (
    <Modal open={!!value} onClose={onClose} size="sm" title={value?.id ? 'Edit leave type' : 'Add leave type'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => {
        if (!f.name?.trim()) { setErr('Give it a name'); return }
        setBusy(true)
        const data = { ...f, code: (f.code || f.name!.split(' ').map((w) => w[0]).join('')).toUpperCase().slice(0, 3) } as LeaveType
        if (value?.id) await api.leaveTypes.update(value.id, data); else await api.leaveTypes.create(data)
        setBusy(false); toast.success('Leave type saved'); onClose()
      }}>Save</Button></>}>
      <div className="grid gap-4">
        <Field label="Name" required error={err}><Input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Maternity Leave" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Days per year"><Input type="number" min={0} value={f.daysPerYear ?? 0} onChange={(e) => setF({ ...f, daysPerYear: Number(e.target.value) })} /></Field>
          <Field label="Colour"><Input type="color" className="p-1" value={f.color ?? '#2A9CB8'} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
        </div>
        <Checkbox checked={!!f.paid} onChange={(v) => setF({ ...f, paid: v })} label="Paid leave" description="Unpaid days are deducted as LWP in payroll." />
        <Checkbox checked={!!f.carryForward} onChange={(v) => setF({ ...f, carryForward: v })} label="Unused days carry forward" />
        <Checkbox checked={!!f.active} onChange={(v) => setF({ ...f, active: v })} label="Active" />
      </div>
    </Modal>
  )
}

export function LogLeaveModal({ open, onClose, empId: fixedEmp }: { open: boolean; onClose: () => void; empId?: string }) {
  const { emps, types, holidays } = useDb((db) => ({ emps: db.employees.filter((e) => e.status !== 'inactive'), types: db.leaveTypes.filter((t) => t.active), holidays: db.holidays }))
  const [f, setF] = useState({ empId: fixedEmp ?? '', typeId: 'lt_cl', from: today(), to: today(), reason: '', halfDay: false, approve: true })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setF((p) => ({ ...p, empId: fixedEmp ?? p.empId })); setErrors({}) } }, [open, fixedEmp])
  const days = f.halfDay ? 0.5 : f.to >= f.from ? eachDay(f.from, f.to).filter((d) => !isSunday(d) && !holidays.some((h) => h.date === d && h.type !== 'Optional')).length : 0
  const bal = useDb((db) => (f.empId ? leaveBalance(db, f.empId).find((b) => b.type.id === f.typeId) : undefined), [f.empId, f.typeId])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!f.empId) e.empId = 'Choose an employee'
    if (f.to < f.from) e.to = 'End date is before start'
    if (!f.reason.trim()) e.reason = 'Add a short reason'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    await api.leaves.create({ empId: f.empId, typeId: f.typeId, from: f.from, to: f.halfDay ? f.from : f.to, days, halfDay: f.halfDay, reason: f.reason, status: f.approve ? 'approved' : 'pending', decidedOn: f.approve ? today() : undefined })
    setBusy(false)
    toast.success(f.approve ? 'Leave logged and approved' : 'Leave request created')
    setF({ ...f, reason: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log leave" description="Record leave on someone’s behalf — e.g. when they called in sick." icon={<CalendarPlus className="h-5 w-5" />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>{f.approve ? `Log ${days} day${days === 1 ? '' : 's'}` : 'Create request'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee" required error={errors.empId} className="sm:col-span-2">
          <Select value={f.empId} disabled={!!fixedEmp} onChange={(e) => setF({ ...f, empId: e.target.value })} options={[{ value: '', label: 'Select employee' }, ...emps.map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))]} />
        </Field>
        <Field label="Leave type" className="sm:col-span-2" hint={bal ? `${bal.left} of ${bal.total} days left this year` : undefined}>
          <Select value={f.typeId} onChange={(e) => setF({ ...f, typeId: e.target.value })} options={types.map((t) => ({ value: t.id, label: t.name }))} />
        </Field>
        <Field label="From"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: e.target.value > f.to ? e.target.value : f.to })} /></Field>
        <Field label="To" error={errors.to}><Input type="date" value={f.halfDay ? f.from : f.to} disabled={f.halfDay} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Checkbox className="sm:col-span-2" checked={f.halfDay} onChange={(v) => setF({ ...f, halfDay: v })} label="Half day" />
        <Field label="Reason" required error={errors.reason} className="sm:col-span-2"><Textarea value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Called in with fever" /></Field>
        <Checkbox className="sm:col-span-2" checked={f.approve} onChange={(v) => setF({ ...f, approve: v })} label="Mark as approved" description="Untick to send it through the normal approval queue." />
      </div>
      {bal && days > bal.left && bal.total > 0 && <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-[13px] font-semibold text-[rgb(161_98_7)] dark:text-warning">This exceeds the remaining balance by {days - bal.left} day(s). Extra days will be unpaid.</p>}
    </Modal>
  )
}
