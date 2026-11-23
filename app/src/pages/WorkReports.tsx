import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Bell, Check, CheckCircle2, CircleDashed, ClipboardList, Clock3, Download, Trash2, X } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { activeEmployees, empMap, lastWorkingDay } from '@/data/selectors'
import type { WorkReport } from '@/data/types'
import { cn, downloadFile, fmtDate, fmtDay, fmtShort, toCSV, today } from '@/lib/utils'
import {
  AvatarStack, Button, ConfirmDialog, DataTable, Drawer, EmptyState, Field, IconButton, Input, Modal, PageHeader, Person, SearchInput, Segmented,
  Stat, StatusBadge, Textarea, Toolbar, toast, type Column,
} from '@/components/ui'

export default function WorkReports() {
  const { reports, map, missing, lwd } = useDb((db) => {
    const lwd = lastWorkingDay(db)
    const submitted = new Set(db.reports.filter((r) => r.date === lwd).map((r) => r.empId))
    const present = new Set(db.attendance.filter((a) => a.date === lwd && a.checkIn).map((a) => a.empId))
    return { reports: db.reports, map: empMap(db), lwd, missing: activeEmployees(db).filter((e) => present.has(e.id) && !submitted.has(e.id)) }
  })
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [reject, setReject] = useState<string[] | null>(null)
  const [del, setDel] = useState<string[] | null>(null)

  const counts = useMemo(() => ({
    pending: reports.filter((r) => r.status === 'pending').length, approved: reports.filter((r) => r.status === 'approved').length,
    rejected: reports.filter((r) => r.status === 'rejected').length, all: reports.length,
  }), [reports])
  const rows = reports.filter((r) => (status === 'all' || r.status === status) && (!from || r.date >= from) && (!to || r.date <= to) &&
    (!q || `${map.get(r.empId)?.name} ${map.get(r.empId)?.code} ${r.title} ${r.summary}`.toLowerCase().includes(q.toLowerCase())))
  const lwdReports = reports.filter((r) => r.date === lwd)
  const avgHours = lwdReports.length ? lwdReports.reduce((n, r) => n + r.hours, 0) / lwdReports.length : 0

  const approve = async (ids: string[]) => { await api.reports.decide(ids, 'approved'); toast.success(`${ids.length > 1 ? `${ids.length} reports` : 'Report'} approved`); setSelected([]) }

  const columns: Column<WorkReport>[] = [
    { key: 'date', header: 'Date', sort: (r) => r.date, cell: (r) => <div className="whitespace-nowrap"><p className="num font-semibold">{fmtShort(r.date)}</p><p className="text-xs text-subtle">{fmtDay(r.date)}</p></div> },
    { key: 'emp', header: 'Employee', sort: (r) => map.get(r.empId)?.name ?? '', cell: (r) => <Person emp={map.get(r.empId)} size={32} sub={map.get(r.empId)?.code} /> },
    { key: 'hours', header: 'Hours', align: 'right', sort: (r) => r.hours, cell: (r) => <span className={cn('num font-bold', r.hours < 6 && 'text-primary-ink')}>{r.hours.toFixed(1)}h</span> },
    {
      key: 'summary', header: 'Summary',
      cell: (r) => <div className="max-w-[420px]"><p className="truncate font-semibold">{r.title}</p><p className="line-clamp-1 text-[13px] text-muted">{r.summary}</p>
        <p className="mt-0.5 text-xs text-subtle">{r.tasks.filter((t) => t.done).length}/{r.tasks.length} tasks done{r.blockers ? ' · has blocker' : ''}</p></div>,
    },
    { key: 'status', header: 'Status', sort: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'act', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: (r) => r.status === 'pending' ? (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => approve([r.id])}>Approve</Button>
          <IconButton size="icon-sm" variant="secondary" label="Reject" icon={<X className="h-4 w-4" />} onClick={() => setReject([r.id])} />
        </div>
      ) : null,
    },
  ]

  return (
    <>
      <PageHeader title="Work reports" subtitle="Daily updates from the team. Review, approve, and see who still needs to submit."
        actions={<Button icon={<Download className="h-4 w-4" />} onClick={() => {
          downloadFile('work-reports.csv', toCSV(rows.map((r) => ({ Date: r.date, Employee: map.get(r.empId)?.name, Hours: r.hours, Title: r.title, Summary: r.summary, Status: r.status }))))
          toast.success(`Exported ${rows.length} reports`)
        }}>Export</Button>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={lwd === today() ? 'Submitted today' : `Submitted ${fmtDay(lwd)}`} value={lwdReports.length} icon={<ClipboardList className="h-4 w-4" />} footnote={`${avgHours.toFixed(1)}h average logged`} />
        <Stat label="Awaiting review" value={counts.pending} tone="orange" icon={<CircleDashed className="h-4 w-4" />} onClick={() => setStatus('pending')} />
        <Stat label="Approved" value={counts.approved} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setStatus('approved')} />
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-muted">Not submitted ({fmtShort(lwd)})</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-soft text-danger"><AlertCircle className="h-4 w-4" /></span></div>
          <div className="num text-[26px] font-extrabold leading-none">{missing.length}</div>
          {missing.length > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <AvatarStack people={missing} size={24} />
              <Button size="sm" variant="soft" icon={<Bell className="h-3.5 w-3.5" />} onClick={() => toast.success(`Reminder sent to ${missing.length} people`)}>Remind</Button>
            </div>
          ) : <p className="text-xs text-subtle">Everyone who worked has reported.</p>}
        </div>
      </div>

      <Toolbar>
        <Segmented value={status} onChange={(v) => { setStatus(v); setSelected([]) }} options={[
          { value: 'pending', label: 'Pending', count: counts.pending }, { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'rejected', label: 'Rejected', count: counts.rejected }, { value: 'all', label: 'All', count: counts.all },
        ]} />
      </Toolbar>
      <Toolbar>
        <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search name, code or work…" />
        <Input type="date" className="w-full sm:w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" className="w-full sm:w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        {(from || to || q) && <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setQ('') }}>Reset</Button>}
      </Toolbar>
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setOpenId(r.id)} defaultSort={{ key: 'date', dir: 'desc' }}
        selectable selected={selected} onSelectedChange={setSelected}
        bulkActions={<>
          <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => approve(selected)}>Approve</Button>
          <Button size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => setReject(selected)}>Reject</Button>
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(selected)}>Delete</Button>
        </>}
        empty={<EmptyState icon={<ClipboardList className="h-5 w-5" />} title={status === 'pending' ? 'Nothing to review' : 'No reports found'} body={status === 'pending' ? 'All reports have been reviewed.' : 'Try different filters.'} />} />

      <ReportDrawer report={reports.find((r) => r.id === openId)} onClose={() => setOpenId(null)} onReject={(id) => setReject([id])} />
      <RejectModal ids={reject} onClose={() => setReject(null)} onDone={() => setSelected([])} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete ${del?.length} report(s)?`} body="This can’t be undone."
        onConfirm={async () => { await api.reports.remove(del!); setDel(null); setSelected([]); toast.success('Deleted') }} />
    </>
  )
}

export function RejectModal({ ids, onClose, onDone }: { ids: string[] | null; onClose: () => void; onDone?: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (ids) setNote('') }, [ids])
  return (
    <Modal open={!!ids} onClose={onClose} size="sm" title={`Send back ${ids && ids.length > 1 ? `${ids.length} reports` : 'report'}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!note.trim()} loading={busy} onClick={async () => {
        setBusy(true); await api.reports.decide(ids!, 'rejected', note); setBusy(false); toast.success('Sent back with feedback'); onDone?.(); onClose()
      }}>Reject with feedback</Button></>}>
      <Field label="Feedback" required hint="The employee sees this and can resubmit.">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please add measurable outcomes for each task." autoFocus />
      </Field>
    </Modal>
  )
}

export function ReportDrawer({ report, onClose, onReject }: { report?: WorkReport; onClose: () => void; onReject: (id: string) => void }) {
  const emp = useDb((db) => db.employees.find((e) => e.id === report?.empId), [report?.empId])
  if (!report) return null
  return (
    <Drawer open onClose={onClose} title={report.title} subtitle={`${fmtDay(report.date)}, ${fmtDate(report.date)}`} headerExtra={<StatusBadge status={report.status} />}
      footer={report.status === 'pending' && <>
        <Button icon={<X className="h-4 w-4" />} onClick={() => onReject(report.id)}>Reject</Button>
        <Button variant="success" icon={<Check className="h-4 w-4" />} onClick={async () => { await api.reports.decide([report.id], 'approved'); toast.success('Report approved'); onClose() }}>Approve</Button>
      </>}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3"><Person emp={emp} /><span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-1.5 text-sm font-bold"><Clock3 className="h-4 w-4 text-subtle" />{report.hours.toFixed(1)} hours</span></div>
        <div><p className="label-xs mb-2">Summary</p><p className="text-sm leading-relaxed text-ink">{report.summary}</p></div>
        <div>
          <p className="label-xs mb-2">Tasks</p>
          <ul className="flex flex-col gap-2">
            {report.tasks.map((t, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm">
                {t.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleDashed className="h-4 w-4 text-subtle" />}
                <span className={cn(!t.done && 'text-muted')}>{t.text}</span>
                {!t.done && <span className="ml-auto text-xs font-semibold text-subtle">Carried over</span>}
              </li>
            ))}
          </ul>
        </div>
        {report.blockers && <div className="rounded-xl bg-warning-soft p-3.5"><p className="text-xs font-bold text-[rgb(161_98_7)] dark:text-warning">Blocker</p><p className="mt-1 text-sm">{report.blockers}</p></div>}
        {report.reviewNote && <div className="rounded-xl bg-danger-soft p-3.5"><p className="text-xs font-bold text-danger">Feedback</p><p className="mt-1 text-sm">{report.reviewNote}</p></div>}
      </div>
    </Drawer>
  )
}
