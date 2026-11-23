import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, Briefcase, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, FileText, Mail, MapPin,
  MoreHorizontal, Package, Pencil, Phone, Target, UserCheck, UserX, Wallet,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { fmtGoalValue, goalProgress, leaveBalance, profileCompletion } from '@/data/selectors'
import { deductions } from '@/lib/payroll'
import { cn, endOfMonth, fmtDate, fmtTime, money, parseISO, startOfMonth, today, toISO, toMins, addDays, monthName } from '@/lib/utils'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, KeyValue, Menu, MenuItem, Progress, StatusBadge, Tabs, toast,
} from '@/components/ui'
import { LogLeaveModal } from '@/pages/Leave'
import { AssignAssetModal } from '@/pages/Assets'
import { GoalModal } from '@/pages/Goals'

type Tab = 'overview' | 'attendance' | 'leave' | 'pay' | 'assets' | 'goals' | 'documents'

export default function EmployeeProfile() {
  const { id } = useParams()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'overview'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const d = useDb((db) => {
    const emp = db.employees.find((e) => e.id === id)
    if (!emp) return null
    return {
      emp,
      manager: db.employees.find((e) => e.id === emp.managerId),
      reports: db.employees.filter((e) => e.managerId === emp.id),
      shift: db.shifts.find((s) => s.id === emp.shiftId),
      attendance: db.attendance.filter((a) => a.empId === emp.id),
      leaves: db.leaves.filter((l) => l.empId === emp.id).sort((a, b) => b.from.localeCompare(a.from)),
      leaveTypes: db.leaveTypes,
      balance: leaveBalance(db, emp.id),
      salary: db.salaries.find((s) => s.empId === emp.id),
      statutory: db.statutory,
      payslips: db.payrollRuns.map((r) => ({ run: r, line: r.lines.find((l) => l.empId === emp.id) })).filter((x) => x.line),
      assets: db.assets.filter((a) => a.assignedTo === emp.id),
      goals: db.goals.filter((g) => g.empId === emp.id),
      role: db.roles.find((r) => r.id === emp.roleId),
      reportsCount: db.reports.filter((r) => r.empId === emp.id).length,
    }
  }, [id])
  const [modal, setModal] = useState<'leave' | 'asset' | 'goal' | 'deactivate' | null>(null)

  if (!d) return <EmptyState title="Employee not found" body="They may have been deleted." action={<Button onClick={() => nav('/people')}>Back to employees</Button>} />
  const { emp } = d
  const completion = profileCompletion(emp)
  const tenureMonths = Math.max(0, Math.round((parseISO(today()).getTime() - parseISO(emp.joinDate).getTime()) / (86400000 * 30.4)))
  const missing = [
    !emp.bank.account && 'Bank account', !emp.documents.pan && 'PAN card', !emp.documents.aadhaar && 'Aadhaar card', !emp.documents.signature && 'Signature',
    !emp.documents.certificates && 'Educational certificates', !emp.emergency.name && 'Emergency contact', !emp.address.line1 && 'Address',
  ].filter(Boolean) as string[]

  return (
    <div>
      <Link to="/people" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink"><ArrowLeft className="h-4 w-4" /> Employees</Link>

      {/* header */}
      <section className="card relative overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/90 via-orange-400 to-blue-500" aria-hidden />
        <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end">
          <Avatar name={emp.name} hue={emp.avatarHue} size={88} className="-mt-11 ring-4 ring-surface" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{emp.name}</h1>
              <StatusBadge status={emp.status} />
              <Badge>{emp.code}</Badge>
            </div>
            <p className="text-sm text-muted">{emp.designation} · {emp.department}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Mail className="h-4 w-4" />} onClick={() => nav(`/mail?to=${encodeURIComponent(emp.email)}`)}>Email</Button>
            <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => nav(`/people/${emp.id}/edit`)}>Edit</Button>
            <Menu width="w-56" trigger={(p) => <IconButton {...p} variant="secondary" label="More actions" icon={<MoreHorizontal className="h-4 w-4" />} />}>
              {(close) => (
                <>
                  <MenuItem icon={<CalendarDays className="h-4 w-4" />} onClick={() => { close(); setModal('leave') }}>Log leave</MenuItem>
                  <MenuItem icon={<Package className="h-4 w-4" />} onClick={() => { close(); setModal('asset') }}>Assign asset</MenuItem>
                  <MenuItem icon={<Target className="h-4 w-4" />} onClick={() => { close(); setModal('goal') }}>Set a goal</MenuItem>
                  {emp.status === 'onboarding' && <MenuItem icon={<UserCheck className="h-4 w-4" />} onClick={async () => { close(); await api.employees.setStatus([emp.id], 'active'); toast.success(`${emp.name} is now active`) }}>Mark as active</MenuItem>}
                  {emp.status === 'active' && <MenuItem icon={<Clock className="h-4 w-4" />} onClick={async () => { close(); await api.employees.update(emp.id, { status: 'notice' }); toast.success(`${emp.name} marked as serving notice`) }}>Mark on notice</MenuItem>}
                  {emp.status !== 'inactive'
                    ? <MenuItem danger icon={<UserX className="h-4 w-4" />} onClick={() => { close(); setModal('deactivate') }}>Deactivate</MenuItem>
                    : <MenuItem icon={<UserCheck className="h-4 w-4" />} onClick={async () => { close(); await api.employees.setStatus([emp.id], 'active'); toast.success('Reactivated') }}>Reactivate</MenuItem>}
                </>
              )}
            </Menu>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
          {[
            [Mail, 'Email', emp.email], [Phone, 'Phone', emp.phone || '—'],
            [Briefcase, 'Reports to', d.manager?.name ?? '—'], [MapPin, 'Location', `${emp.branch} · ${d.shift?.name ?? ''} shift`],
          ].map(([Icon, k, v]) => {
            const I = Icon as typeof Mail
            return (
              <div key={k as string} className="flex min-w-0 items-center gap-3 bg-surface px-5 py-3.5">
                <I className="h-4 w-4 shrink-0 text-subtle" />
                <div className="min-w-0"><p className="text-xs text-subtle">{k as string}</p><p className="truncate text-sm font-semibold">{v as string}</p></div>
              </div>
            )
          })}
        </div>
      </section>

      <Tabs className="mt-6" value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: 'Overview' }, { value: 'attendance', label: 'Attendance' }, { value: 'leave', label: 'Leave', count: d.leaves.filter((l) => l.status === 'pending').length },
        { value: 'pay', label: 'Pay' }, { value: 'assets', label: 'Assets', count: d.assets.length }, { value: 'goals', label: 'Goals', count: d.goals.length },
        { value: 'documents', label: 'Documents' },
      ]} />

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card title="Job">
                <KeyValue cols={3} items={[
                  ['Department', emp.department], ['Designation', emp.designation], ['Team', emp.team],
                  ['Employment type', emp.employmentType], ['Date of joining', fmtDate(emp.joinDate)], ['Tenure', tenureMonths >= 12 ? `${Math.floor(tenureMonths / 12)} yr ${tenureMonths % 12} mo` : `${tenureMonths} months`],
                  ['Branch', emp.branch], ['Work location', emp.workLocation], ['Shift', d.shift ? `${d.shift.name} · ${fmtTime(d.shift.start)}–${fmtTime(d.shift.end)}` : '—'],
                  ['Access role', d.role?.name], ['Reports to', d.manager?.name], ['Direct reports', d.reports.length ? d.reports.map((r) => r.name).join(', ') : 'None'],
                ]} />
              </Card>
              <Card title="Personal">
                <KeyValue cols={3} items={[
                  ['Date of birth', fmtDate(emp.dob)], ['Gender', emp.gender], ['Marital status', emp.maritalStatus],
                  ['Blood group', emp.bloodGroup], ['Personal email', emp.personalEmail], ['Phone', emp.phone],
                  ['Address', [emp.address.line1, emp.address.city, emp.address.state, emp.address.pincode].filter(Boolean).join(', ')],
                  ['Emergency contact', emp.emergency.name ? `${emp.emergency.name} (${emp.emergency.relation})` : ''], ['Emergency phone', emp.emergency.phone],
                ]} />
              </Card>
            </div>
            <div className="flex flex-col gap-4">
              <Card title="Profile completeness">
                <div className="flex items-center gap-3">
                  <span className="num text-3xl font-extrabold">{completion}%</span>
                  <Progress value={completion} tone={completion === 100 ? 'success' : 'orange'} />
                </div>
                {missing.length ? (
                  <ul className="mt-4 flex flex-col gap-2">
                    {missing.map((m) => <li key={m} className="flex items-center gap-2 text-sm text-muted"><AlertCircle className="h-4 w-4 text-primary-ink" /> {m} missing</li>)}
                  </ul>
                ) : <p className="mt-3 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Everything is on file.</p>}
                {missing.length > 0 && <Button size="sm" className="mt-4 w-full" onClick={() => toast.success(`Reminder sent to ${emp.name}`, { body: `Asked to upload: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}` })}>Remind {emp.name.split(' ')[0]} to complete</Button>}
              </Card>
              <Card title="Leave balance">
                <ul className="flex flex-col gap-3">
                  {d.balance.map((b) => (
                    <li key={b.type.id}>
                      <div className="mb-1 flex justify-between text-[13px]"><span className="font-semibold">{b.type.name}</span><span className="num text-muted"><b className="text-ink">{b.left}</b> / {b.total} left</span></div>
                      <Progress size="sm" value={(b.left / b.total) * 100} tone={b.left / b.total < 0.25 ? 'danger' : 'blue'} />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === 'attendance' && <AttendanceCalendar records={d.attendance} />}

        {tab === 'leave' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Balances" action={<Button size="sm" variant="primary" onClick={() => setModal('leave')}>Log leave</Button>}>
              <ul className="flex flex-col gap-3">
                {d.balance.map((b) => (
                  <li key={b.type.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                    <span className="h-9 w-1.5 rounded-full" style={{ background: b.type.color }} />
                    <div className="flex-1"><p className="text-sm font-semibold">{b.type.name}</p><p className="text-xs text-subtle">{b.used} used of {b.total}</p></div>
                    <span className="num text-xl font-extrabold">{b.left}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="lg:col-span-2" title="History">
              {d.leaves.length === 0 ? <EmptyState title="No leave taken yet" /> : (
                <ul className="-mx-5 divide-y divide-line">
                  {d.leaves.map((l) => {
                    const t = d.leaveTypes.find((x) => x.id === l.typeId)
                    return (
                      <li key={l.id} className="flex items-start gap-3 px-5 py-3">
                        <span className="mt-1.5 h-2 w-2 rounded-full" style={{ background: t?.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{t?.name} · {l.days} day{l.days > 1 ? 's' : ''} <span className="font-normal text-subtle">({fmtDate(l.from)}{l.to !== l.from && ` – ${fmtDate(l.to)}`})</span></p>
                          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{l.reason}</p>
                        </div>
                        <StatusBadge status={l.status} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        )}

        {tab === 'pay' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Salary structure" subtitle="Monthly" action={<Button size="sm" onClick={() => nav(`/payroll?tab=structures&edit=${emp.id}`)}>Edit</Button>}>
              {d.salary && d.salary.basic > 0 ? (() => {
                const x = deductions(d.salary, d.statutory)
                return (
                  <dl className="flex flex-col gap-2 text-sm">
                    {[['Basic', d.salary.basic], ['HRA', d.salary.hra], ['Special allowance', d.salary.special]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="num font-semibold">{money(v as number)}</dd></div>)}
                    <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>Gross</dt><dd className="num">{money(x.gross)}</dd></div>
                    {[['Provident fund', x.pf], ['ESI', x.esi], ['Professional tax', x.pt], ['TDS', x.tds]].filter(([, v]) => (v as number) > 0).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="num text-danger">−{money(v as number)}</dd></div>)}
                    <div className="mt-1 flex justify-between rounded-xl bg-success-soft px-3 py-2.5 font-extrabold text-success"><dt>In-hand</dt><dd className="num">{money(x.net)}</dd></div>
                  </dl>
                )
              })() : <EmptyState title="No salary set up" body="Add a structure so they’re included in payroll." action={<Button size="sm" variant="primary" onClick={() => nav(`/payroll?tab=structures&edit=${emp.id}`)}>Set up salary</Button>} />}
            </Card>
            <Card className="lg:col-span-2" title="Payslips">
              {d.payslips.length === 0 ? <EmptyState title="No payslips yet" /> : (
                <ul className="-mx-5 divide-y divide-line">
                  {d.payslips.map(({ run, line }) => (
                    <li key={run.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><Wallet className="h-4 w-4" /></span>
                      <div className="flex-1"><p className="text-sm font-semibold">{run.label}</p><p className="text-xs text-subtle">Gross {money(line!.gross)}{line!.lwpDays ? ` · ${line!.lwpDays} LWP day(s)` : ''}</p></div>
                      <span className="num font-bold">{money(line!.net)}</span>
                      <StatusBadge status={run.status} />
                      <IconButton label="Download payslip" size="icon-sm" icon={<Download className="h-4 w-4" />} onClick={() => toast.success(`Payslip for ${run.label} downloaded`)} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {tab === 'assets' && (
          <Card title="Assigned assets" action={<Button size="sm" variant="primary" icon={<Package className="h-3.5 w-3.5" />} onClick={() => setModal('asset')}>Assign asset</Button>}>
            {d.assets.length === 0 ? <EmptyState icon={<Package className="h-5 w-5" />} title="Nothing assigned" body="Laptops, phones, SIMs and ID cards given to this person show up here." /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {d.assets.map((a) => (
                  <div key={a.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between"><Badge tone="blue">{a.category}</Badge><span className="num text-xs text-subtle">{a.code}</span></div>
                    <p className="mt-2 font-bold">{a.name}</p>
                    <p className="text-xs text-subtle">{a.specs}</p>
                    <p className="mt-2 text-xs text-muted">Since {fmtDate(a.assignedOn)}</p>
                    <Button size="sm" className="mt-3" onClick={async () => { await api.assets.assign(a.id, undefined); toast.success(`${a.name} collected back`) }}>Collect back</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab === 'goals' && (
          <Card title="Goals" action={<Button size="sm" variant="primary" icon={<Target className="h-3.5 w-3.5" />} onClick={() => setModal('goal')}>Set a goal</Button>}>
            {d.goals.length === 0 ? <EmptyState icon={<Target className="h-5 w-5" />} title="No goals yet" /> : (
              <ul className="flex flex-col gap-3">
                {d.goals.map((g) => {
                  const p = goalProgress(g)
                  return (
                    <li key={g.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-bold">{g.title}</p><StatusBadge status={g.status} /></div>
                      <div className="mt-3 flex items-center gap-3"><Progress value={p} tone={g.status === 'behind' ? 'danger' : g.status === 'at-risk' ? 'warning' : 'blue'} /><span className="num w-12 text-right text-sm font-bold">{p.toFixed(0)}%</span></div>
                      <p className="mt-2 text-xs text-subtle">{fmtGoalValue(g.current, g.unit)} of {fmtGoalValue(g.target, g.unit)} · due {fmtDate(g.deadline)}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        )}

        {tab === 'documents' && (
          <Card title="Documents">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {([['photo', 'Profile photo'], ['pan', 'PAN card'], ['aadhaar', 'Aadhaar card'], ['signature', 'Signature'], ['certificates', 'Educational certificates']] as const).map(([k, label]) => {
                const has = emp.documents[k]
                return (
                  <li key={k} className="flex items-center gap-3 rounded-xl border border-line p-3.5">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', has ? 'bg-success-soft text-success' : 'bg-surface-3 text-subtle')}><FileText className="h-4 w-4" /></span>
                    <div className="flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-subtle">{has ? 'Uploaded · verified' : 'Not uploaded'}</p></div>
                    {has ? <IconButton size="icon-sm" label={`Download ${label}`} icon={<Download className="h-4 w-4" />} onClick={() => toast.success(`${label} downloaded`)} />
                      : <Button size="sm" onClick={async () => { await api.employees.update(emp.id, { documents: { ...emp.documents, [k]: true } }); toast.success(`${label} uploaded`) }}>Upload</Button>}
                  </li>
                )
              })}
              <li className="flex items-center gap-3 rounded-xl border border-line p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><FileText className="h-4 w-4" /></span>
                <div className="flex-1"><p className="text-sm font-semibold">Offer letter</p><p className="text-xs text-subtle">Generated by HRMS</p></div>
                <Button size="sm" onClick={() => nav('/onboarding')}>View</Button>
              </li>
            </ul>
          </Card>
        )}
      </div>

      <LogLeaveModal open={modal === 'leave'} onClose={() => setModal(null)} empId={emp.id} />
      <AssignAssetModal open={modal === 'asset'} onClose={() => setModal(null)} empId={emp.id} />
      <GoalModal open={modal === 'goal'} onClose={() => setModal(null)} empId={emp.id} />
      <ConfirmDialog open={modal === 'deactivate'} onClose={() => setModal(null)} title={`Deactivate ${emp.name}?`} confirmLabel="Deactivate"
        body="They’ll lose app access immediately. Records are kept and you can reactivate any time."
        onConfirm={async () => { await api.employees.setStatus([emp.id], 'inactive'); setModal(null); toast.success(`${emp.name} deactivated`) }} />
    </div>
  )
}

function AttendanceCalendar({ records }: { records: { date: string; status: string; checkIn?: string; checkOut?: string }[] }) {
  const [month, setMonth] = useState(startOfMonth(today()))
  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records])
  const first = parseISO(month)
  const days: (string | null)[] = Array(first.getDay()).fill(null)
  for (let dd = month; dd <= endOfMonth(month); dd = addDays(dd, 1)) days.push(dd)
  const inMonth = records.filter((r) => r.date.startsWith(month.slice(0, 7)))
  const count = (s: string[]) => inMonth.filter((r) => s.includes(r.status)).length
  const worked = inMonth.filter((r) => r.checkIn && r.checkOut)
  const avg = worked.length ? worked.reduce((n, r) => n + toMins(r.checkOut!) - toMins(r.checkIn!), 0) / worked.length / 60 : 0
  const color: Record<string, string> = {
    present: 'bg-blue-500 text-white', late: 'bg-primary text-on-primary', 'half-day': 'bg-violet-400 text-white', absent: 'bg-danger text-white',
    leave: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200', holiday: 'bg-surface-3 text-subtle', weekend: 'bg-transparent text-subtle',
  }
  const shift = (n: number) => setMonth(toISO(new Date(first.getFullYear(), first.getMonth() + n, 1)))
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2" title={`${monthName(first.getMonth(), true)} ${first.getFullYear()}`}
        action={<div className="flex gap-1"><IconButton size="icon-sm" variant="secondary" label="Previous month" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => shift(-1)} /><IconButton size="icon-sm" variant="secondary" label="Next month" disabled={month >= startOfMonth(today())} icon={<ChevronRight className="h-4 w-4" />} onClick={() => shift(1)} /></div>}>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => <div key={w} className="pb-1 text-xs font-bold text-subtle">{w}</div>)}
          {days.map((dd, i) => {
            if (!dd) return <div key={i} />
            const r = byDate.get(dd)
            return (
              <div key={dd} title={r ? `${fmtDate(dd)} — ${r.status}${r.checkIn ? ` · in ${fmtTime(r.checkIn)}` : ''}${r.checkOut ? `, out ${fmtTime(r.checkOut)}` : ''}` : fmtDate(dd)}
                className={cn('flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold', r ? color[r.status] : 'bg-surface-2 text-subtle', dd === today() && 'ring-2 ring-ink')}>
                {parseISO(dd).getDate()}
                {r?.checkIn && <span className="hidden text-[10px] font-semibold opacity-80 sm:block">{r.checkIn}</span>}
              </div>
            )
          })}
        </div>
      </Card>
      <Card title="This month">
        <ul className="flex flex-col gap-3">
          {[['Present', count(['present']), 'bg-blue-500'], ['Late', count(['late']), 'bg-primary'], ['Half day', count(['half-day']), 'bg-violet-400'], ['Absent', count(['absent']), 'bg-danger'], ['On leave', count(['leave']), 'bg-blue-200']].map(([k, v, c]) => (
            <li key={k as string} className="flex items-center gap-3 text-sm"><span className={cn('h-3 w-3 rounded', c as string)} /><span className="flex-1 text-muted">{k}</span><span className="num font-bold">{v}</span></li>
          ))}
        </ul>
        <div className="mt-5 rounded-xl bg-surface-2 p-4"><p className="text-xs text-subtle">Average day</p><p className="num text-2xl font-extrabold">{avg.toFixed(1)}h</p></div>
      </Card>
    </div>
  )
}
