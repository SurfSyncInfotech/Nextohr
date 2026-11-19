import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, CheckCheck, ClipboardList, FileSignature, Inbox, X } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap, leaveBalance } from '@/data/selectors'
import { cn, diffDays, fmtDate, fmtRange, fmtShort, today } from '@/lib/utils'
import { Badge, Button, Dot, EmptyState, IconButton, PageHeader, Person, Tabs, toast } from '@/components/ui'
import { DecisionModal } from './Leave'
import { RejectModal, ReportDrawer } from './WorkReports'

type Tab = 'all' | 'leave' | 'reports' | 'offers'

export default function Approvals() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'all'
  const data = useDb((db) => ({
    leaves: db.leaves.filter((l) => l.status === 'pending').sort((a, b) => a.from.localeCompare(b.from)),
    reports: db.reports.filter((r) => r.status === 'pending'),
    offers: db.offers.filter((o) => o.status === 'draft'),
    map: empMap(db), types: new Map(db.leaveTypes.map((t) => [t.id, t])),
    balances: new Map(db.employees.map((e) => [e.id, leaveBalance(db, e.id)])),
    onLeave: db.leaves.filter((l) => l.status === 'approved'),
  }))
  const [decision, setDecision] = useState<{ ids: string[]; d: 'approved' | 'rejected' } | null>(null)
  const [rejectReports, setRejectReports] = useState<string[] | null>(null)
  const [openReport, setOpenReport] = useState<string | null>(null)
  const total = data.leaves.length + data.reports.length + data.offers.length

  // Routine reports: full day logged, all tasks done, no blockers — safe to bulk approve.
  const routine = useMemo(() => data.reports.filter((r) => r.hours >= 7 && r.tasks.every((t) => t.done) && !r.blockers), [data.reports])
  const reportsByDate = useMemo(() => {
    const g = new Map<string, typeof data.reports>()
    data.reports.forEach((r) => g.set(r.date, [...(g.get(r.date) ?? []), r]))
    return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [data.reports])

  return (
    <>
      <PageHeader title="Approvals" subtitle={total ? `${total} items are waiting on you. Oldest first, with the context you need to decide.` : 'Nothing waiting on you.'}>
        <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[
          { value: 'all', label: 'Everything', count: total, icon: <Inbox className="h-4 w-4" /> },
          { value: 'leave', label: 'Leave', count: data.leaves.length, icon: <CalendarDays className="h-4 w-4" /> },
          { value: 'reports', label: 'Work reports', count: data.reports.length, icon: <ClipboardList className="h-4 w-4" /> },
          { value: 'offers', label: 'Offer drafts', count: data.offers.length, icon: <FileSignature className="h-4 w-4" /> },
        ]} />
      </PageHeader>

      {total === 0 && <div className="card"><EmptyState icon={<CheckCheck className="h-5 w-5" />} title="Inbox zero" body="Every request has been handled. New ones will appear here." /></div>}

      {(tab === 'all' || tab === 'leave') && data.leaves.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Leave requests</h2>
            {data.leaves.length > 1 && <Button size="sm" onClick={() => setDecision({ ids: data.leaves.map((l) => l.id), d: 'approved' })} icon={<CheckCheck className="h-3.5 w-3.5" />}>Approve all {data.leaves.length}</Button>}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.leaves.map((l) => {
              const emp = data.map.get(l.empId)
              const t = data.types.get(l.typeId)
              const bal = data.balances.get(l.empId)?.find((b) => b.type.id === l.typeId)
              const overlap = data.onLeave.filter((o) => o.empId !== l.empId && data.map.get(o.empId)?.department === emp?.department && o.from <= l.to && o.to >= l.from)
              const waited = diffDays(l.appliedOn, today())
              return (
                <article key={l.id} className="card flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <Person emp={emp} sub={`${emp?.designation} · ${emp?.department}`} className="flex-1" />
                    {waited >= 2 && <Badge tone="danger">Waiting {waited}d</Badge>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-2 font-bold"><Dot color={t?.color ?? '#999'} />{t?.name}</span>
                    <span className="font-semibold">{fmtRange(l.from, l.to)}</span>
                    <span className="text-subtle">{l.days} day{l.days > 1 ? 's' : ''}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">“{l.reason}”</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {bal && <span className={cn('rounded-lg px-2 py-1 font-semibold', bal.left < l.days ? 'bg-danger-soft text-danger' : 'bg-surface-3 text-muted')}>Balance: {bal.left} of {bal.total} left</span>}
                    {overlap.length > 0 && <span className="rounded-lg bg-warning-soft px-2 py-1 font-semibold text-[rgb(161_98_7)] dark:text-warning">{overlap.map((o) => data.map.get(o.empId)?.name.split(' ')[0]).join(', ')} also off then</span>}
                    <span className="rounded-lg bg-surface-3 px-2 py-1 font-semibold text-muted">Applied {fmtShort(l.appliedOn)}</span>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-line pt-4">
                    <Button variant="success" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={async () => { await api.leaves.decide([l.id], 'approved'); toast.success(`Approved ${emp?.name}'s leave`, { action: { label: 'Undo', onClick: () => api.leaves.decide([l.id], 'pending') } }) }}>Approve</Button>
                    <Button size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: [l.id], d: 'rejected' })}>Reject</Button>
                    <Link to={`/people/${l.empId}?tab=leave`} className="ml-auto self-center text-[13px] font-semibold text-accent-ink hover:underline">History</Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {(tab === 'all' || tab === 'reports') && data.reports.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Work reports</h2>
            {routine.length > 0 && (
              <Button size="sm" variant="soft" icon={<CheckCheck className="h-3.5 w-3.5" />} onClick={async () => { await api.reports.decide(routine.map((r) => r.id), 'approved'); toast.success(`${routine.length} routine reports approved`) }}>
                Approve {routine.length} routine reports
              </Button>
            )}
          </div>
          <p className="mb-3 text-[13px] text-subtle">“Routine” = a full day logged, every task done and no blockers. Everything else is worth a quick look.</p>
          <div className="flex flex-col gap-4">
            {reportsByDate.map(([date, list]) => (
              <div key={date} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-2.5">
                  <span className="text-sm font-bold">{fmtDate(date)}</span>
                  <Button size="sm" variant="ghost" onClick={async () => { await api.reports.decide(list.map((r) => r.id), 'approved'); toast.success(`${list.length} reports approved`) }}>Approve all {list.length}</Button>
                </div>
                <ul className="divide-y divide-line">
                  {list.map((r) => (
                    <li key={r.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpenReport(r.id)}>
                        <Person emp={data.map.get(r.empId)} link={false} sub={`${r.hours.toFixed(1)}h · ${r.title}`} className="w-60 shrink-0" />
                        <span className="hidden min-w-0 flex-1 truncate text-[13px] text-muted md:block">{r.summary}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {routine.includes(r) ? <Badge tone="success">Routine</Badge> : r.blockers ? <Badge tone="warning">Blocker</Badge> : r.hours < 7 ? <Badge tone="orange">Short day</Badge> : <Badge>Open tasks</Badge>}
                        <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={async () => { await api.reports.decide([r.id], 'approved'); toast.success('Approved') }}>Approve</Button>
                        <IconButton size="icon-sm" variant="secondary" label="Reject" icon={<X className="h-4 w-4" />} onClick={() => setRejectReports([r.id])} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {(tab === 'all' || tab === 'offers') && data.offers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-bold">Offer letters in draft</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.offers.map((o) => (
              <article key={o.id} className="card flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-ink"><FileSignature className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-bold">{o.candidateName}</p><p className="text-sm text-subtle">{o.designation} · joins {fmtDate(o.joinDate)}</p></div>
                <Link to={`/onboarding/offer/${o.id}`}><Button size="sm" variant="primary">Review & send</Button></Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <DecisionModal open={!!decision} onClose={() => setDecision(null)} ids={decision?.ids ?? []} decision={decision?.d ?? 'approved'} />
      <RejectModal ids={rejectReports} onClose={() => setRejectReports(null)} />
      <ReportDrawer report={data.reports.find((r) => r.id === openReport)} onClose={() => setOpenReport(null)} onReject={(id) => setRejectReports([id])} />
    </>
  )
}
