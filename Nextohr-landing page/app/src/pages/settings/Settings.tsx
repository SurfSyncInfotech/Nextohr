import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, Building2, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, GitBranch, Layers, Lock, MapPin, Palette,
  Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Users2, Download,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import type { Access, DB, Holiday, Module, Role } from '@/data/types'
import { MODULES } from '@/data/types'
import { cn, eachDay, endOfMonth, fmtDate, fmtShort, monthName, parseISO, startOfMonth, today, toISO } from '@/lib/utils'
import { LogoFull } from '@/components/layout/Logo'
import { LeaveTypeModal } from '@/pages/Leave'
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, EmptyState, Field, FileDrop, IconButton, Input, Modal, Select, StatusBadge, Textarea, toast,
  type Column,
} from '@/components/ui'

const SECTIONS = [
  { key: 'profile', label: 'Company profile', icon: Building2 },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'branches', label: 'Branches', icon: GitBranch },
  { key: 'departments', label: 'Departments', icon: Layers },
  { key: 'teams', label: 'Teams', icon: Users2 },
  { key: 'locations', label: 'Work locations', icon: MapPin },
  { key: 'holidays', label: 'Holiday calendar', icon: CalendarDays },
  { key: 'shifts', label: 'Shifts', icon: Clock },
  { key: 'leave', label: 'Leave policies', icon: FileText },
  { key: 'policies', label: 'Company policies', icon: ShieldCheck },
  { key: 'roles', label: 'Roles & permissions', icon: Lock },
] as const
type Key = (typeof SECTIONS)[number]['key']

export default function Settings() {
  const { section = 'profile' } = useParams()
  const nav = useNavigate()
  const done = useDb((db) => db.setupDone)
  const idx = SECTIONS.findIndex((s) => s.key === section)
  const cur = SECTIONS[Math.max(0, idx)]!
  const next = SECTIONS[idx + 1]
  const body: Record<Key, ReactNode> = {
    profile: <Profile />, branding: <Branding />, branches: <Branches />, departments: <Departments />, teams: <Teams />, locations: <Locations />,
    holidays: <Holidays />, shifts: <Shifts />, leave: <LeavePolicies />, policies: <Policies />, roles: <Roles />,
  }
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Company settings</h1>
          <p className="mt-1 text-sm text-subtle">Set up once — every module uses these. <b className="text-ink">{done.length} of {SECTIONS.length}</b> sections complete.</p>
        </div>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done.length / SECTIONS.length) * 100}%` }} /></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="scroll-thin flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start" aria-label="Settings sections">
          {SECTIONS.map((s, i) => {
            const ok = done.includes(s.key)
            return (
              <Link key={s.key} to={`/settings/${s.key}`} aria-current={s.key === cur.key ? 'page' : undefined}
                className={cn('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', s.key === cur.key ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-muted hover:bg-surface-3 hover:text-ink')}>
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', s.key === cur.key ? 'bg-primary-soft text-primary-ink' : 'bg-surface-3 text-subtle')}><s.icon className="h-4 w-4" /></span>
                <span className="flex-1 whitespace-nowrap">{i + 1}. {s.label}</span>
                {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="h-2 w-2 rounded-full bg-primary" aria-label="Incomplete" />}
              </Link>
            )
          })}
        </nav>
        <div className="min-w-0">
          {body[cur.key]}
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
            {!done.includes(cur.key) ? <Button icon={<Check className="h-4 w-4" />} onClick={() => { api.settings.markDone(cur.key); toast.success(`${cur.label} marked complete`) }}>Mark section complete</Button> : <span />}
            {next ? <Button variant="soft" iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => nav(`/settings/${next.key}`)}>Next: {next.label}</Button> : <Button variant="soft" onClick={() => nav('/')}>Back to dashboard</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHead({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-xl font-extrabold tracking-tight">{title}</h2><p className="mt-0.5 text-sm text-subtle">{desc}</p></div>
      {action}
    </div>
  )
}

// ---------------- profile ----------------
function Profile() {
  const saved = useDb((db) => db.company)
  const [c, setC] = useState(saved)
  const [busy, setBusy] = useState(false)
  useEffect(() => setC(saved), [saved])
  const dirty = JSON.stringify(c) !== JSON.stringify(saved)
  const set = (k: keyof typeof c) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value })
  const setA = (k: keyof typeof c.address) => (e: { target: { value: string } }) => setC({ ...c, address: { ...c.address, [k]: e.target.value } })
  return (
    <>
      <SectionHead title="Company profile" desc="Appears on offer letters, payslips and reports." />
      <div className="flex flex-col gap-4">
        <Card title="Basic details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required><Input value={c.name} onChange={set('name')} /></Field>
            <Field label="Legal name"><Input value={c.legalName} onChange={set('legalName')} /></Field>
            <Field label="Admin / HR email" required><Input type="email" value={c.email} onChange={set('email')} /></Field>
            <Field label="Phone"><Input value={c.phone} onChange={set('phone')} /></Field>
            <Field label="Website"><Input value={c.website} onChange={set('website')} /></Field>
            <Field label="Industry"><Select value={c.industry} onChange={set('industry')} options={['IT Services', 'Software Product', 'Consulting', 'Manufacturing', 'Retail', 'Healthcare', 'Education', 'Other']} /></Field>
            <Field label="Company size"><Select value={c.size} onChange={set('size')} options={['1–10 employees', '11–50 employees', '51–200 employees', '201–500 employees', '500+ employees']} /></Field>
            <Field label="Financial year starts"><Select value={c.fiscalYearStart} onChange={set('fiscalYearStart')} options={['April', 'January']} /></Field>
          </div>
        </Card>
        <Card title="Registered address">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" className="sm:col-span-2"><Input value={c.address.line1} onChange={setA('line1')} /></Field>
            <Field label="Address line 2" className="sm:col-span-2"><Input value={c.address.line2} onChange={setA('line2')} /></Field>
            <Field label="City"><Input value={c.address.city} onChange={setA('city')} /></Field>
            <Field label="State"><Input value={c.address.state} onChange={setA('state')} /></Field>
            <Field label="Pincode"><Input value={c.address.pincode} onChange={setA('pincode')} /></Field>
            <Field label="Country"><Input value={c.address.country} onChange={setA('country')} /></Field>
          </div>
        </Card>
        <Card title="Tax & compliance">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="GSTIN"><Input value={c.gstin} onChange={set('gstin')} /></Field>
            <Field label="Company PAN"><Input value={c.pan} onChange={set('pan')} /></Field>
            <Field label="Time zone"><Input value={c.timezone} disabled /></Field>
          </div>
        </Card>
        <div className="flex justify-end gap-2">
          {dirty && <Button onClick={() => setC(saved)}>Discard</Button>}
          <Button variant="primary" disabled={!dirty} loading={busy} onClick={async () => { setBusy(true); await api.settings.saveCompany(c); setBusy(false); toast.success('Company profile saved') }}>Save profile</Button>
        </div>
      </div>
    </>
  )
}

// ---------------- branding ----------------
function Branding() {
  const { saved, company } = useDb((db) => ({ saved: db.branding, company: db.company }))
  const [b, setB] = useState(saved)
  const [logo, setLogo] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => setB(saved), [saved])
  const bg = b.loginStyle === 'gradient' ? `linear-gradient(135deg, ${b.secondary}, ${b.primary})` : b.loginStyle === 'solid' ? b.primary : `radial-gradient(circle at 30% 20%, ${b.secondary}55, transparent 50%), radial-gradient(circle at 80% 80%, ${b.primary}55, transparent 50%), #0f1720`
  return (
    <>
      <SectionHead title="Branding" desc="Your logo and colours on the login page, employee app and generated documents." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Card title="Logo">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-44 shrink-0 items-center justify-center rounded-2xl border border-line bg-white px-3"><LogoFull height={52} /></div>
              <div className="flex-1"><FileDrop label="Upload a new logo" accept="image/*" value={logo} onChange={setLogo} hint="SVG or PNG, at least 256 px" /></div>
            </div>
          </Card>
          <Card title="Login page">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tagline" className="sm:col-span-2"><Input value={b.tagline} onChange={(e) => setB({ ...b, tagline: e.target.value })} /></Field>
              <Field label="Primary colour">
                <div className="flex gap-2"><input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-line-strong bg-surface p-1" value={b.primary} onChange={(e) => setB({ ...b, primary: e.target.value })} aria-label="Primary colour" /><Input value={b.primary} onChange={(e) => setB({ ...b, primary: e.target.value })} /></div>
              </Field>
              <Field label="Secondary colour">
                <div className="flex gap-2"><input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-line-strong bg-surface p-1" value={b.secondary} onChange={(e) => setB({ ...b, secondary: e.target.value })} aria-label="Secondary colour" /><Input value={b.secondary} onChange={(e) => setB({ ...b, secondary: e.target.value })} /></div>
              </Field>
              <Field label="Background style" className="sm:col-span-2"><Select value={b.loginStyle} onChange={(e) => setB({ ...b, loginStyle: e.target.value as typeof b.loginStyle })} options={[{ value: 'gradient', label: 'Gradient (secondary → primary)' }, { value: 'solid', label: 'Solid primary' }, { value: 'image', label: 'Dark with glow' }]} /></Field>
            </div>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setB({ ...b, primary: '#F68713', secondary: '#2A9CB8' })}>Reset to SurfSync colours</Button>
          </Card>
          <div className="flex justify-end"><Button variant="primary" loading={busy} onClick={async () => { setBusy(true); await api.settings.saveBranding(b); setBusy(false); toast.success('Branding saved') }}>Save branding</Button></div>
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="label-xs mb-2">Live preview</p>
          <div className="flex aspect-[4/5] items-center justify-center rounded-3xl p-6 shadow-pop" style={{ background: bg }}>
            <div className="w-full max-w-[260px] rounded-2xl bg-white p-5 text-center shadow-xl">
              <LogoFull height={46} className="mx-auto" />
              <p className="mt-2 text-sm font-extrabold text-gray-900">{company.name}</p>
              <p className="text-[11px] text-gray-500">{b.tagline}</p>
              <div className="mt-4 h-8 rounded-lg border border-gray-200 bg-gray-50" />
              <div className="mt-2 h-8 rounded-lg border border-gray-200 bg-gray-50" />
              <div className="mt-3 flex h-8 items-center justify-center rounded-lg text-xs font-bold" style={{ background: b.primary, color: '#fff', textShadow: '0 1px 1px rgb(0 0 0 / 0.2)' }}>Sign in</div>
            </div>
          </div>
          <Link to="/login" className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-accent-ink hover:underline">Open the real login page <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </>
  )
}

// ---------------- generic collection section ----------------
interface FieldDef { key: string; label: string; type?: 'text' | 'number' | 'select' | 'textarea' | 'time' | 'checkbox' | 'days'; options?: string[]; required?: boolean; span?: boolean; hint?: string }

function Collection<T extends { id: string; active?: boolean }>({ title, desc, items, columns, fields, coll, blank, noun }: {
  title: string; desc: string; items: T[]; columns: Column<T>[]; fields: FieldDef[]; noun: string
  coll: { create: (x: never) => Promise<string>; update: (id: string, x: never) => Promise<void>; remove: (id: string) => Promise<void> }; blank: Partial<T>
}) {
  const [edit, setEdit] = useState<Partial<T> | null>(null)
  const [del, setDel] = useState<T | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const get = (k: string) => (edit as Record<string, unknown> | null)?.[k]
  const set = (k: string, v: unknown) => setEdit({ ...edit, [k]: v } as Partial<T>)
  const save = async () => {
    const e: Record<string, string> = {}
    fields.forEach((f) => { if (f.required && !String(get(f.key) ?? '').trim()) e[f.key] = `${f.label} is required` })
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    if (edit && 'id' in edit && edit.id) await coll.update(edit.id as string, edit as never); else await coll.create(edit as never)
    setBusy(false); toast.success(`${noun} saved`); setEdit(null)
  }
  return (
    <>
      <SectionHead title={title} desc={desc} action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setErrors({}); setEdit(blank) }}>Add {noun.toLowerCase()}</Button>} />
      <DataTable rows={items} rowKey={(r) => r.id} onRowClick={(r) => { setErrors({}); setEdit(r) }} columns={[
        ...columns,
        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.active === false ? 'inactive' : 'active'} /> },
        {
          key: 'act', header: <span className="sr-only">Actions</span>, align: 'right',
          cell: (r) => <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <IconButton size="icon-sm" label={`Edit`} icon={<Pencil className="h-4 w-4" />} onClick={() => { setErrors({}); setEdit(r) }} />
            <IconButton size="icon-sm" label={`Delete`} icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(r)} />
          </div>,
        },
      ]} empty={<EmptyState title={`No ${title.toLowerCase()} yet`} action={<Button variant="primary" onClick={() => setEdit(blank)}>Add {noun.toLowerCase()}</Button>} />} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && 'id' in edit && edit.id ? `Edit ${noun.toLowerCase()}` : `Add ${noun.toLowerCase()}`}
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const v = get(f.key)
            const cls = f.span || f.type === 'textarea' ? 'sm:col-span-2' : undefined
            if (f.type === 'checkbox') return <Checkbox key={f.key} className={cls} checked={!!v} onChange={(x) => set(f.key, x)} label={f.label} description={f.hint} />
            if (f.type === 'days') {
              const days = (v as string[]) ?? []
              return (
                <Field key={f.key} label={f.label} className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => set(f.key, days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
                        className={cn('h-9 w-12 rounded-lg border text-sm font-semibold', days.includes(d) ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line-strong text-muted')}>{d}</button>
                    ))}
                  </div>
                </Field>
              )
            }
            return (
              <Field key={f.key} label={f.label} required={f.required} error={errors[f.key]} hint={f.hint} className={cls}>
                {f.type === 'select' ? <Select value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} options={f.options!} />
                  : f.type === 'textarea' ? <Textarea value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
                    : <Input type={f.type ?? 'text'} value={String(v ?? '')} onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />}
              </Field>
            )
          })}
        </div>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete this ${noun.toLowerCase()}?`} body="Employees already linked keep their records, but you won’t be able to pick it for new ones."
        onConfirm={async () => { await coll.remove(del!.id); setDel(null); toast.success(`${noun} deleted`) }} />
    </>
  )
}

function Branches() {
  const items = useDb((db) => db.branches)
  const count = useDb((db) => (n: string) => db.employees.filter((e) => e.branch === n).length)
  return <Collection title="Branches" noun="Branch" desc="Head office and branch locations." items={items} coll={api.branches as never}
    blank={{ name: '', code: '', city: '', state: '', type: 'Branch', active: true }}
    columns={[
      { key: 'name', header: 'Name', cell: (b) => <span className="font-semibold">{b.name}</span> }, { key: 'code', header: 'Code', cell: (b) => <span className="num text-muted">{b.code}</span> },
      { key: 'loc', header: 'Location', cell: (b) => `${b.city}${b.state !== '—' ? `, ${b.state}` : ''}` }, { key: 'type', header: 'Type', cell: (b) => <Badge tone={b.type === 'Head Office' ? 'orange' : 'neutral'}>{b.type}</Badge> },
      { key: 'people', header: 'People', align: 'right', cell: (b) => <span className="num">{count(b.name)}</span> },
    ]}
    fields={[{ key: 'name', label: 'Branch name', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'type', label: 'Type', type: 'select', options: ['Head Office', 'Branch', 'Remote'] }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
}

function Departments() {
  const { items, emps } = useDb((db) => ({ items: db.departments, emps: db.employees }))
  return <Collection title="Departments" noun="Department" desc="Groups for reporting, payroll and approvals." items={items} coll={api.departments as never}
    blank={{ name: '', code: '', description: '', active: true }}
    columns={[
      { key: 'name', header: 'Department', cell: (d) => <div><p className="font-semibold">{d.name}</p><p className="line-clamp-1 max-w-md text-xs text-subtle">{d.description}</p></div> },
      { key: 'code', header: 'Code', cell: (d) => <span className="num text-muted">{d.code}</span> },
      { key: 'head', header: 'Head', hideBelow: 'md', cell: (d) => emps.find((e) => e.id === d.headId)?.name ?? '—' },
      { key: 'people', header: 'People', align: 'right', cell: (d) => <span className="num">{emps.filter((e) => e.department === d.name && e.status !== 'inactive').length}</span> },
    ]}
    fields={[{ key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
}

function Teams() {
  const { items, departments } = useDb((db) => ({ items: db.teams, departments: db.departments.map((d) => d.name) }))
  return <Collection title="Teams" noun="Team" desc="Smaller groups inside departments for collaboration and reporting." items={items} coll={api.teams as never}
    blank={{ name: '', department: departments[0], description: '', active: true }}
    columns={[{ key: 'name', header: 'Team', cell: (t) => <div><p className="font-semibold">{t.name}</p><p className="line-clamp-1 max-w-md text-xs text-subtle">{t.description}</p></div> }, { key: 'dept', header: 'Department', cell: (t) => t.department }]}
    fields={[{ key: 'name', label: 'Name', required: true }, { key: 'department', label: 'Department', type: 'select', options: departments }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
}

function Locations() {
  const items = useDb((db) => db.workLocations)
  return <Collection title="Work locations" noun="Location" desc="Where people check in. GPS check-ins outside the geofence are flagged." items={items} coll={api.workLocations as never}
    blank={{ name: '', type: 'Office', address: '', radius: 150, active: true }}
    columns={[
      { key: 'name', header: 'Location', cell: (l) => <div><p className="font-semibold">{l.name}</p><p className="text-xs text-subtle">{l.address}</p></div> },
      { key: 'type', header: 'Type', cell: (l) => <Badge tone={l.type === 'Remote' ? 'violet' : l.type === 'Office' ? 'blue' : 'neutral'}>{l.type}</Badge> },
      { key: 'geo', header: 'Geofence', cell: (l) => l.radius ? `${l.radius} m radius` : <span className="text-subtle">Not required</span> },
    ]}
    fields={[{ key: 'name', label: 'Name', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['Office', 'Remote', 'Client site'] }, { key: 'address', label: 'Address', span: true, hint: 'Exact coordinates are fetched from the address.' }, { key: 'radius', label: 'Geofence radius (m)', type: 'number', hint: '0 = no geofence' }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
}

function Shifts() {
  const { items, emps } = useDb((db) => ({ items: db.shifts, emps: db.employees }))
  return <Collection title="Shifts" noun="Shift" desc="Working hours, grace period and weekly offs." items={items} coll={api.shifts as never}
    blank={{ name: '', start: '09:00', end: '18:00', breakMins: 60, graceMins: 15, weeklyOff: ['Sun'], active: true }}
    columns={[
      { key: 'name', header: 'Shift', cell: (s) => <span className="font-semibold">{s.name}</span> }, { key: 'time', header: 'Timing', cell: (s) => <span className="num">{s.start} – {s.end}</span> },
      { key: 'rules', header: 'Rules', hideBelow: 'md', cell: (s) => <span className="text-[13px] text-muted">{s.breakMins} min break · {s.graceMins} min grace</span> },
      { key: 'off', header: 'Weekly off', cell: (s) => s.weeklyOff.join(', ') }, { key: 'people', header: 'People', align: 'right', cell: (s) => <span className="num">{emps.filter((e) => e.shiftId === s.id).length}</span> },
    ]}
    fields={[{ key: 'name', label: 'Shift name', required: true, span: true }, { key: 'start', label: 'Starts', type: 'time' }, { key: 'end', label: 'Ends', type: 'time' }, { key: 'breakMins', label: 'Break (minutes)', type: 'number' }, { key: 'graceMins', label: 'Late after (grace minutes)', type: 'number' }, { key: 'weeklyOff', label: 'Weekly off', type: 'days' }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
}

function Policies() {
  const { items, total } = useDb((db) => ({ items: db.policies, total: db.employees.filter((e) => e.status === 'active').length }))
  return <Collection title="Company policies" noun="Policy" desc="Policies employees read and accept during onboarding." items={items} coll={api.policies as never}
    blank={{ title: '', body: '', requiresAcceptance: true, active: true, updatedAt: today(), acceptedBy: 0 }}
    columns={[
      { key: 'title', header: 'Policy', cell: (p) => <div><p className="font-semibold">{p.title}</p><p className="line-clamp-1 max-w-lg text-xs text-subtle">{p.body}</p></div> },
      { key: 'acc', header: 'Acceptance', cell: (p) => p.requiresAcceptance ? <span className="text-[13px]"><b className="num">{p.acceptedBy}</b>/{total} accepted</span> : <span className="text-[13px] text-subtle">Read only</span> },
      { key: 'upd', header: 'Updated', hideBelow: 'md', cell: (p) => <span className="num text-muted">{fmtDate(p.updatedAt)}</span> },
    ]}
    fields={[{ key: 'title', label: 'Title', required: true, span: true }, { key: 'body', label: 'Policy text', type: 'textarea', required: true }, { key: 'requiresAcceptance', label: 'Employees must accept', type: 'checkbox' }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
}

function LeavePolicies() {
  const types = useDb((db) => db.leaveTypes)
  const [edit, setEdit] = useState<Partial<DB['leaveTypes'][number]> | null>(null)
  return (
    <>
      <SectionHead title="Leave policies" desc="Leave types and yearly allocation. The same list powers the Leave module." action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ name: '', daysPerYear: 12, paid: true, carryForward: false, active: true, color: '#2A9CB8' })}>Add leave type</Button>} />
      <DataTable rows={types} rowKey={(t) => t.id} onRowClick={setEdit} columns={[
        { key: 'name', header: 'Leave type', cell: (t) => <span className="inline-flex items-center gap-2 font-semibold"><span className="h-3 w-3 rounded" style={{ background: t.color }} />{t.name}</span> },
        { key: 'days', header: 'Days / year', align: 'right', cell: (t) => <span className="num">{t.daysPerYear || '—'}</span> },
        { key: 'paid', header: 'Paid', cell: (t) => <Badge tone={t.paid ? 'success' : 'neutral'}>{t.paid ? 'Paid' : 'Unpaid'}</Badge> },
        { key: 'cf', header: 'Carry forward', cell: (t) => (t.carryForward ? 'Yes' : 'No') },
        { key: 'st', header: 'Status', cell: (t) => <StatusBadge status={t.active ? 'active' : 'inactive'} /> },
      ]} />
      <LeaveTypeModal value={edit} onClose={() => setEdit(null)} />
    </>
  )
}

// ---------------- holidays ----------------
function Holidays() {
  const holidays = useDb((db) => db.holidays)
  const [month, setMonth] = useState(startOfMonth(today()))
  const [pick, setPick] = useState<{ date: string; name: string; type: Holiday['type'] } | null>(null)
  const [loading, setLoading] = useState<'national' | 'google' | null>(null)
  const m = parseISO(month)
  const days: (string | null)[] = Array(m.getDay()).fill(null)
  eachDay(month, endOfMonth(month)).forEach((d) => days.push(d))
  const year = m.getFullYear()
  const yearList = useMemo(() => holidays.filter((h) => h.date.startsWith(String(year))).sort((a, b) => a.date.localeCompare(b.date)), [holidays, year])
  const color: Record<Holiday['type'], string> = { National: 'bg-danger-soft text-danger ring-danger/30', Festival: 'bg-primary-soft text-primary-ink ring-primary/30', Regional: 'bg-accent-soft text-accent-ink ring-accent/30', Optional: 'bg-surface-3 text-muted ring-line-strong' }
  const shift = (n: number) => setMonth(toISO(new Date(m.getFullYear(), m.getMonth() + n, 1)))

  return (
    <>
      <SectionHead title="Holiday calendar" desc="Click any date to add or remove a holiday. Holidays aren’t counted as absences or LWP."
        action={<div className="flex flex-wrap gap-2">
          <Button loading={loading === 'national'} icon={<Download className="h-4 w-4" />} onClick={async () => { setLoading('national'); const n = await api.holidays.loadNational(year); setLoading(null); toast.success(n ? `${n} national holidays added for ${year}` : `National holidays for ${year} are already in`) }}>Load {year} national holidays</Button>
          <Button loading={loading === 'google'} icon={<RefreshCw className="h-4 w-4" />} onClick={async () => { setLoading('google'); await new Promise((r) => setTimeout(r, 900)); setLoading(null); toast.success('Synced with Google Calendar', { body: 'Holidays now appear on everyone’s work calendar.' }) }}>Sync Google Calendar</Button>
        </div>} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card title={`${monthName(m.getMonth(), true)} ${year}`} action={<div className="flex gap-1"><IconButton size="icon-sm" variant="secondary" label="Previous month" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => shift(-1)} /><IconButton size="icon-sm" variant="secondary" label="Next month" icon={<ChevronRight className="h-4 w-4" />} onClick={() => shift(1)} /></div>}>
          <div className="grid grid-cols-7 gap-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="pb-1 text-center text-xs font-bold text-subtle">{d}</div>)}
            {days.map((d, i) => {
              if (!d) return <div key={i} />
              const h = holidays.find((x) => x.date === d)
              return (
                <button key={d} onClick={() => h ? api.holidays.toggle(d, h.name, h.type).then(() => toast.success(`${h.name} removed`, { action: { label: 'Undo', onClick: () => api.holidays.toggle(d, h.name, h.type) } })) : setPick({ date: d, name: '', type: 'Festival' })}
                  className={cn('flex min-h-[76px] flex-col items-start rounded-xl border p-2 text-left transition-colors', h ? `ring-1 ${color[h.type]} border-transparent` : 'border-line hover:border-primary hover:bg-primary-soft/40', parseISO(d).getDay() === 0 && !h && 'bg-surface-2')}>
                  <span className={cn('num text-sm font-bold', d === today() && 'flex h-6 w-6 items-center justify-center rounded-full bg-ink text-surface')}>{parseISO(d).getDate()}</span>
                  {h && <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-tight">{h.name}</span>}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
            {(Object.keys(color) as Holiday['type'][]).map((t) => <span key={t} className={cn('rounded-md px-2 py-0.5 ring-1', color[t])}>{t}</span>)}
          </div>
        </Card>
        <Card title={`${year} holidays`} subtitle={`${yearList.length} days`}>
          <ul className="scroll-thin -mr-2 flex max-h-[520px] flex-col gap-1 overflow-y-auto pr-2">
            {yearList.map((h) => (
              <li key={h.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <span className="num w-14 text-xs font-bold text-muted">{fmtShort(h.date)}</span>
                <span className="flex-1 truncate text-sm font-semibold">{h.name}</span>
                <span className={cn('rounded-md px-1.5 text-[10px] font-bold ring-1', color[h.type])}>{h.type[0]}</span>
                <IconButton size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" label={`Remove ${h.name}`} icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => api.holidays.remove(h.id)} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Modal open={!!pick} onClose={() => setPick(null)} size="sm" title={`Add holiday — ${pick && fmtDate(pick.date)}`}
        footer={<><Button onClick={() => setPick(null)}>Cancel</Button><Button variant="primary" disabled={!pick?.name.trim()} onClick={async () => { await api.holidays.toggle(pick!.date, pick!.name, pick!.type); toast.success(`${pick!.name} added`); setPick(null) }}>Add holiday</Button></>}>
        {pick && <div className="grid gap-4">
          <Field label="Name" required><Input value={pick.name} onChange={(e) => setPick({ ...pick, name: e.target.value })} placeholder="e.g. Diwali" autoFocus /></Field>
          <Field label="Type" hint="Optional holidays don’t close the office — employees can choose to take them."><Select value={pick.type} onChange={(e) => setPick({ ...pick, type: e.target.value as Holiday['type'] })} options={['National', 'Festival', 'Regional', 'Optional']} /></Field>
        </div>}
      </Modal>
    </>
  )
}

// ---------------- roles ----------------
const ACCESS: { value: Access; label: string }[] = [{ value: 'none', label: 'No access' }, { value: 'view', label: 'View' }, { value: 'edit', label: 'Edit' }, { value: 'full', label: 'Full' }]
function Roles() {
  const roles = useDb((db) => db.roles)
  const [edit, setEdit] = useState<Partial<Role> | null>(null)
  const [del, setDel] = useState<Role | null>(null)
  const [busy, setBusy] = useState(false)
  const blank = (): Partial<Role> => ({ name: '', description: '', permissions: Object.fromEntries(MODULES.map((m) => [m, 'none'])) as Record<Module, Access>, members: 0 })
  return (
    <>
      <SectionHead title="Roles & permissions" desc="Decide who can see and change each module." action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit(blank())}>Add role</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => {
          const n = Object.values(r.permissions).filter((a) => a !== 'none').length
          return (
            <div key={r.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><Lock className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="font-bold">{r.name} {r.system && <Badge className="ml-1">System</Badge>}</p><p className="text-sm text-subtle">{r.description}</p></div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-[13px] text-muted"><span><b className="num text-ink">{n}</b>/{MODULES.length} modules</span><span>·</span><span><b className="num text-ink">{r.members}</b> members</span></div>
              <div className="mt-3 flex flex-wrap gap-1">{MODULES.filter((m) => r.permissions[m] !== 'none').slice(0, 6).map((m) => <Badge key={m} tone={r.permissions[m] === 'full' ? 'orange' : r.permissions[m] === 'edit' ? 'blue' : 'neutral'}>{m}</Badge>)}{n > 6 && <Badge>+{n - 6}</Badge>}</div>
              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <Button size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(r)}>Edit permissions</Button>
                {!r.system && <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(r)}>Delete</Button>}
              </div>
            </div>
          )
        })}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} size="lg" title={edit?.id ? `Edit ${edit.name}` : 'New role'}
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!edit?.name?.trim()} onClick={async () => {
          setBusy(true); if (edit!.id) await api.roles.update(edit!.id, edit!); else await api.roles.create(edit as Role); setBusy(false); toast.success('Role saved'); setEdit(null)
        }}>Save role</Button></>}>
        {edit && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role name" required><Input value={edit.name} disabled={edit.system} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Finance" /></Field>
              <Field label="Description"><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead><tr className="bg-surface-2 text-xs font-bold uppercase tracking-wider text-subtle"><th className="px-4 py-2.5 text-left">Module</th>{ACCESS.map((a) => <th key={a.value} className="px-2 py-2.5 text-center">{a.label}</th>)}</tr></thead>
                <tbody>
                  {MODULES.map((mod) => (
                    <tr key={mod} className="border-t border-line">
                      <td className="px-4 py-2 font-semibold">{mod}</td>
                      {ACCESS.map((a) => (
                        <td key={a.value} className="px-2 py-2 text-center">
                          <input type="radio" name={`perm-${mod}`} aria-label={`${mod}: ${a.label}`} className="h-4 w-4 cursor-pointer accent-[#F68713]" disabled={edit.id === 'role_admin'}
                            checked={edit.permissions?.[mod] === a.value} onChange={() => setEdit({ ...edit, permissions: { ...edit.permissions!, [mod]: a.value } })} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {edit.id === 'role_admin' && <p className="text-xs text-subtle">Tenant admin always has full access so you can’t lock yourself out.</p>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete ${del?.name}?`} body="Members of this role move to the Employee role."
        onConfirm={async () => { await api.roles.remove(del!.id); setDel(null); toast.success('Role deleted') }} />
    </>
  )
}
