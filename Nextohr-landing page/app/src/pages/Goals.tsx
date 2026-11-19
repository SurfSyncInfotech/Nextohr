import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Flag, Target, TrendingUp, Trash2, Users } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap, fmtGoalValue, goalProgress } from '@/data/selectors'
import type { Goal } from '@/data/types'
import { addDays, cn, diffDays, fmtDate, fmtShort, today } from '@/lib/utils'
import {
  Avatar, Button, ConfirmDialog, DataTable, Drawer, EmptyState, Field, Input, Modal, PageHeader, Person, Progress, SearchInput, Segmented, Select,
  Stat, StatusBadge, Textarea, Toolbar, toast, type Column,
} from '@/components/ui'

export default function Goals() {
  const { goals, map, emps, departments } = useDb((db) => ({ goals: db.goals, map: empMap(db), emps: db.employees.filter((e) => e.status === 'active' || e.status === 'notice'), departments: db.departments }))
  const [view, setView] = useState<'goals' | 'people'>('goals')
  const [status, setStatus] = useState('')
  const [dept, setDept] = useState('')
  const [q, setQ] = useState('')
  const [create, setCreate] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = goals.find((g) => g.id === openId)

  const stats = useMemo(() => ({
    active: goals.filter((g) => g.status !== 'completed').length,
    onTrack: goals.filter((g) => g.status === 'on-track').length,
    risk: goals.filter((g) => g.status === 'at-risk' || g.status === 'behind').length,
    done: goals.filter((g) => g.status === 'completed').length,
    avg: goals.length ? goals.reduce((n, g) => n + goalProgress(g), 0) / goals.length : 0,
  }), [goals])

  const rows = goals.filter((g) => {
    const e = map.get(g.empId)
    return (!status || g.status === status) && (!dept || e?.department === dept) && (!q || `${g.title} ${e?.name}`.toLowerCase().includes(q.toLowerCase()))
  })

  const columns: Column<Goal>[] = [
    { key: 'title', header: 'Goal', sort: (g) => g.title, cell: (g) => <div className="min-w-[220px]"><p className="font-semibold">{g.title}</p><p className="line-clamp-1 text-xs text-subtle">{g.description}</p></div> },
    { key: 'owner', header: 'Owner', sort: (g) => map.get(g.empId)?.name ?? '', cell: (g) => <Person emp={map.get(g.empId)} size={30} /> },
    {
      key: 'progress', header: 'Progress', sort: (g) => goalProgress(g),
      cell: (g) => { const p = goalProgress(g); return (
        <div className="w-44">
          <div className="mb-1 flex justify-between text-xs"><span className="num font-bold">{p.toFixed(0)}%</span><span className="truncate text-subtle">{fmtGoalValue(g.current, g.unit)} / {fmtGoalValue(g.target, g.unit)}</span></div>
          <Progress size="sm" value={p} tone={g.status === 'behind' ? 'danger' : g.status === 'at-risk' ? 'warning' : g.status === 'completed' ? 'success' : 'blue'} />
        </div>
      ) },
    },
    {
      key: 'deadline', header: 'Due', sort: (g) => g.deadline, hideBelow: 'md',
      cell: (g) => { const left = diffDays(today(), g.deadline); return <div className="whitespace-nowrap"><p className="num font-medium">{fmtDate(g.deadline)}</p><p className={cn('text-xs', left < 0 && g.status !== 'completed' ? 'font-bold text-danger' : 'text-subtle')}>{g.status === 'completed' ? 'Done' : left < 0 ? `${-left} days overdue` : `${left} days left`}</p></div> },
    },
    { key: 'status', header: 'Status', sort: (g) => g.status, cell: (g) => <StatusBadge status={g.status} /> },
  ]

  const people = emps.filter((e) => !dept || e.department === dept).filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase())).map((e) => {
    const gs = goals.filter((g) => g.empId === e.id)
    return { emp: e, count: gs.length, done: gs.filter((g) => g.status === 'completed').length, risk: gs.filter((g) => g.status === 'at-risk' || g.status === 'behind').length, avg: gs.length ? gs.reduce((n, g) => n + goalProgress(g), 0) / gs.length : 0 }
  })

  return (
    <>
      <PageHeader title="Goals" subtitle="Set measurable targets, track check-ins and spot what’s slipping early."
        actions={<Button variant="primary" icon={<Target className="h-4 w-4" />} onClick={() => setCreate('')}>Set a goal</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Active goals" value={stats.active} icon={<Flag className="h-4 w-4" />} footnote={`${stats.avg.toFixed(0)}% average progress`} />
        <Stat label="On track" value={stats.onTrack} tone="success" icon={<TrendingUp className="h-4 w-4" />} onClick={() => { setView('goals'); setStatus('on-track') }} />
        <Stat label="At risk or behind" value={stats.risk} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} onClick={() => { setView('goals'); setStatus('at-risk') }} footnote="Worth a 1:1 this week" />
        <Stat label="Completed" value={stats.done} tone="blue" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { setView('goals'); setStatus('completed') }} />
      </div>
      <Toolbar actions={<Segmented value={view} onChange={setView} options={[{ value: 'goals', label: <><Target className="h-3.5 w-3.5" />Goals</> }, { value: 'people', label: <><Users className="h-3.5 w-3.5" />By person</> }]} />}>
        <SearchInput className="w-full sm:w-64" value={q} onChange={setQ} placeholder={view === 'goals' ? 'Search goals or people…' : 'Search people…'} />
        <Select className="w-full sm:w-48" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" options={[{ value: '', label: 'All departments' }, ...departments.map((d) => d.name)]} />
        {view === 'goals' && <Select className="w-full sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" options={[{ value: '', label: 'All statuses' }, { value: 'on-track', label: 'On track' }, { value: 'at-risk', label: 'At risk' }, { value: 'behind', label: 'Behind' }, { value: 'completed', label: 'Completed' }]} />}
      </Toolbar>
      {view === 'goals' ? (
        <DataTable rows={rows} columns={columns} rowKey={(g) => g.id} onRowClick={(g) => setOpenId(g.id)} defaultSort={{ key: 'deadline', dir: 'asc' }}
          empty={<EmptyState icon={<Target className="h-5 w-5" />} title="No goals here" body="Set clear, measurable goals so everyone knows what good looks like." action={<Button variant="primary" onClick={() => setCreate('')}>Set a goal</Button>} />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            <div key={p.emp.id} className="card flex flex-col p-5">
              <div className="flex items-center gap-3"><Avatar name={p.emp.name} hue={p.emp.avatarHue} size={42} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{p.emp.name}</p><p className="truncate text-xs text-subtle">{p.emp.designation}</p></div></div>
              {p.count ? (
                <>
                  <div className="mt-4 flex items-center gap-3"><Progress value={p.avg} /><span className="num text-sm font-bold">{p.avg.toFixed(0)}%</span></div>
                  <p className="mt-2 text-xs text-subtle">{p.count} goal{p.count > 1 ? 's' : ''} · {p.done} done{p.risk ? ` · ${p.risk} need attention` : ''}</p>
                </>
              ) : <p className="mt-4 text-sm text-subtle">No goals yet.</p>}
              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <Button size="sm" variant="soft" onClick={() => setCreate(p.emp.id)}>Set goal</Button>
                {p.count > 0 && <Button size="sm" variant="ghost" onClick={() => { setView('goals'); setQ(p.emp.name); setStatus('') }}>View goals</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <GoalModal open={create !== null} onClose={() => setCreate(null)} empId={create || undefined} />
      <GoalDrawer goal={open} onClose={() => setOpenId(null)} />
    </>
  )
}

function GoalDrawer({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const emp = useDb((db) => db.employees.find((e) => e.id === goal?.empId), [goal?.empId])
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(false)
  useEffect(() => { if (goal) { setValue(String(goal.current)); setNote('') } }, [goal?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!goal) return null
  const p = goalProgress(goal)
  return (
    <Drawer open onClose={onClose} title={goal.title} subtitle={<span className="inline-flex items-center gap-2">Due {fmtDate(goal.deadline)} · <StatusBadge status={goal.status} /></span>}
      footer={<Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(true)}>Delete goal</Button>}>
      <div className="flex flex-col gap-6">
        <Person emp={emp} />
        <p className="text-sm leading-relaxed text-muted">{goal.description}</p>
        <div className="rounded-2xl bg-surface-2 p-5">
          <div className="flex items-end justify-between"><span className="num text-4xl font-extrabold">{p.toFixed(0)}%</span><span className="text-sm text-subtle">{fmtGoalValue(goal.current, goal.unit)} of {fmtGoalValue(goal.target, goal.unit)}</span></div>
          <Progress className="mt-3" value={p} tone={goal.status === 'behind' ? 'danger' : goal.status === 'at-risk' ? 'warning' : 'blue'} />
          <p className="mt-2 text-xs text-subtle">Weight {goal.weight}% of overall rating</p>
        </div>
        {goal.status !== 'completed' && (
          <div className="rounded-2xl border border-line p-4">
            <p className="mb-3 text-sm font-bold">Add a check-in</p>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <Field label={`Current (${goal.unit})`}><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
              <Field label="What changed?"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Closed 2 more deals" /></Field>
            </div>
            <Button className="mt-3" variant="primary" size="sm" loading={busy} disabled={!value} onClick={async () => {
              setBusy(true); await api.goals.checkIn(goal.id, Number(value), note || 'Progress updated'); setBusy(false); setNote(''); toast.success('Check-in saved')
            }}>Save check-in</Button>
          </div>
        )}
        <div>
          <p className="label-xs mb-3">Timeline</p>
          <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
            {[...goal.updates].reverse().map((u, i) => (
              <li key={i} className="relative">
                <span className={cn('absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-surface', i === 0 ? 'bg-primary' : 'bg-line-strong')} />
                <p className="text-sm font-medium">{u.text}</p><p className="text-xs text-subtle">{fmtShort(u.date)} · {fmtGoalValue(u.value, goal.unit)}</p>
              </li>
            ))}
            <li className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-line-strong ring-4 ring-surface" /><p className="text-sm font-medium">Goal created</p><p className="text-xs text-subtle">{fmtShort(goal.createdAt)}</p></li>
          </ol>
        </div>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} title="Delete this goal?" body="Its check-ins will be deleted too."
        onConfirm={async () => { await api.goals.remove(goal.id); setDel(false); onClose(); toast.success('Goal deleted') }} />
    </Drawer>
  )
}

export function GoalModal({ open, onClose, empId }: { open: boolean; onClose: () => void; empId?: string }) {
  const emps = useDb((db) => db.employees.filter((e) => e.status === 'active' || e.status === 'notice'))
  const blank = { empId: empId ?? '', title: '', description: '', target: '', current: '0', unit: '%', deadline: addDays(today(), 60), weight: '20' }
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setF({ ...blank, empId: empId ?? '' }); setErrors({}) } }, [open, empId]) // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    const e: Record<string, string> = {}
    if (!f.empId) e.empId = 'Choose who owns this goal'
    if (!f.title.trim()) e.title = 'Give the goal a clear title'
    if (!Number(f.target)) e.target = 'Set a numeric target'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    await api.goals.create({ empId: f.empId, title: f.title, description: f.description, metric: f.title, target: Number(f.target), current: Number(f.current) || 0, unit: f.unit, deadline: f.deadline, weight: Number(f.weight) || 0 })
    setBusy(false)
    toast.success('Goal set', { body: `${emps.find((x) => x.id === f.empId)?.name} has been notified.` })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Set a goal" description="Good goals are specific, measurable and time-bound." icon={<Target className="h-5 w-5" />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>Set goal</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Owner" required error={errors.empId} className="sm:col-span-2">
          <Select value={f.empId} disabled={!!empId} onChange={(e) => setF({ ...f, empId: e.target.value })} options={[{ value: '', label: 'Select employee' }, ...emps.map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))]} />
        </Field>
        <Field label="Goal" required error={errors.title} className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Increase monthly sales by 15%" /></Field>
        <Field label="Success criteria" className="sm:col-span-2"><Textarea className="min-h-[72px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="How will you know it’s done?" /></Field>
        <Field label="Target" required error={errors.target}><Input type="number" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="e.g. 100" /></Field>
        <Field label="Unit"><Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} options={['%', '₹', 'deals', 'demos', 'tickets', 'articles', 'leads', 'hours', 'days']} /></Field>
        <Field label="Starting value"><Input type="number" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="Deadline"><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        <Field label="Weight (%)" hint="Share of their overall rating"><Input type="number" min={0} max={100} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}
