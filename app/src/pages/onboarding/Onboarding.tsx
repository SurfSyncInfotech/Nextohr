import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, Copy, FilePlus2, FileSignature, FileUp, MailCheck, MoreHorizontal, Send, Trash2, UserPlus, XCircle,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import type { OfferLetter } from '@/data/types'
import { cn, diffDays, fmtDate, fmtShort, money, today } from '@/lib/utils'
import { grossOf } from '@/lib/payroll'
import {
  Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, FileDrop, IconButton, Input, Menu, MenuDivider, MenuItem, Modal, PageHeader, Progress,
  Select, Tabs, toast,
} from '@/components/ui'

const COLUMNS: { status: OfferLetter['status']; label: string; hint: string; tone: string }[] = [
  { status: 'draft', label: 'Draft', hint: 'Not sent yet', tone: 'bg-surface-3' },
  { status: 'sent', label: 'Awaiting response', hint: 'Candidate has the offer', tone: 'bg-accent-soft' },
  { status: 'accepted', label: 'Accepted', hint: 'Ready to onboard', tone: 'bg-success-soft' },
  { status: 'declined', label: 'Declined', hint: 'Closed', tone: 'bg-danger-soft' },
]

export default function Onboarding() {
  const nav = useNavigate()
  const [tab, setTab] = useState<'pipeline' | 'onboarding'>('pipeline')
  const [upload, setUpload] = useState(false)
  const { offers, joiners, assets } = useDb((db) => ({
    offers: db.offers,
    joiners: db.employees.filter((e) => e.status === 'onboarding').sort((a, b) => a.joinDate.localeCompare(b.joinDate)),
    assets: db.assets,
  }))
  const [del, setDel] = useState<OfferLetter | null>(null)
  const recentAccepted = useMemo(() => offers.filter((o) => o.status === 'accepted').sort((a, b) => (b.respondedAt ?? '').localeCompare(a.respondedAt ?? '')), [offers])

  const card = (o: OfferLetter) => {
    const ctc = (grossOf(o.salary) + o.salary.employerPf) * 12
    const waiting = o.sentAt ? diffDays(o.sentAt, today()) : 0
    return (
      <article key={o.id} className="group rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
        <div className="flex items-start gap-3">
          <Avatar name={o.candidateName} hue={(o.candidateName.charCodeAt(0) * 37) % 360} size={36} />
          <div className="min-w-0 flex-1">
            <Link to={`/onboarding/offer/${o.id}`} className="block truncate text-sm font-bold hover:underline">{o.candidateName}</Link>
            <p className="truncate text-xs text-subtle">{o.designation} · {o.department}</p>
          </div>
          <Menu width="w-52" trigger={(p) => <IconButton {...p} size="icon-sm" label={`Actions for ${o.candidateName}`} icon={<MoreHorizontal className="h-4 w-4" />} />}>
            {(close) => (
              <>
                <MenuItem icon={<FileSignature className="h-4 w-4" />} onClick={() => { close(); nav(`/onboarding/offer/${o.id}`) }}>{o.status === 'draft' ? 'Edit offer' : 'View offer'}</MenuItem>
                {o.status === 'draft' && <MenuItem icon={<Send className="h-4 w-4" />} onClick={async () => { close(); await api.offers.setStatus(o.id, 'sent'); toast.success(`Offer sent to ${o.email}`) }}>Send to candidate</MenuItem>}
                {o.status === 'sent' && <>
                  <MenuItem icon={<MailCheck className="h-4 w-4" />} onClick={() => { close(); toast.success(`Reminder sent to ${o.candidateName}`) }}>Send reminder</MenuItem>
                  <MenuItem icon={<CheckCircle2 className="h-4 w-4" />} onClick={async () => { close(); await api.offers.setStatus(o.id, 'accepted'); toast.success('Marked as accepted') }}>Mark accepted</MenuItem>
                  <MenuItem icon={<XCircle className="h-4 w-4" />} onClick={async () => { close(); await api.offers.setStatus(o.id, 'declined'); toast.success('Marked as declined') }}>Mark declined</MenuItem>
                </>}
                <MenuItem icon={<Copy className="h-4 w-4" />} onClick={async () => { close(); const id = await api.offers.save({ ...o, id: undefined, status: 'draft', sentAt: undefined, respondedAt: undefined, empId: undefined, candidateName: `${o.candidateName} (copy)` }); nav(`/onboarding/offer/${id}`) }}>Duplicate</MenuItem>
                <MenuDivider />
                <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => { close(); setDel(o) }}>Delete</MenuItem>
              </>
            )}
          </Menu>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-subtle">CTC <b className="num text-ink">{money(ctc)}</b>/yr</span>
          <span className="text-subtle">Joins <b className="text-ink">{fmtShort(o.joinDate)}</b></span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {o.source === 'uploaded' && <Badge>Uploaded PDF</Badge>}
          {o.status === 'sent' && <Badge tone={waiting > 5 ? 'warning' : 'blue'}>Sent {waiting === 0 ? 'today' : `${waiting}d ago`}</Badge>}
          {o.status === 'accepted' && !o.empId && (
            <Button size="sm" variant="soft" className="ml-auto" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={async () => { const id = await api.offers.convert(o.id); toast.success(`${o.candidateName} added to onboarding`); nav(`/people/${id}`) }}>Start onboarding</Button>
          )}
          {o.status === 'accepted' && o.empId && <Link to={`/people/${o.empId}`} className="ml-auto text-xs font-bold text-accent-ink hover:underline">View employee</Link>}
          {o.status === 'draft' && <Button size="sm" variant="primary" className="ml-auto" icon={<Send className="h-3.5 w-3.5" />} onClick={async () => { await api.offers.setStatus(o.id, 'sent'); toast.success(`Offer sent to ${o.email}`) }}>Send</Button>}
        </div>
      </article>
    )
  }

  return (
    <>
      <PageHeader title="Hiring & onboarding" subtitle="From offer letter to first day — track every candidate and new joiner."
        actions={<>
          <Button icon={<FileUp className="h-4 w-4" />} onClick={() => setUpload(true)}>Upload signed PDF</Button>
          <Button variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => nav('/onboarding/offer/new')}>Create offer letter</Button>
        </>}>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'pipeline', label: 'Offer pipeline', count: offers.filter((o) => o.status === 'draft' || o.status === 'sent').length }, { value: 'onboarding', label: 'Joining soon', count: joiners.length }]} />
      </PageHeader>

      {tab === 'pipeline' && (
        <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1000px] grid-cols-4 gap-4">
            {COLUMNS.map((c) => {
              const list = (c.status === 'accepted' ? recentAccepted : offers.filter((o) => o.status === c.status))
              return (
                <section key={c.status} className="flex flex-col rounded-2xl bg-surface-2 p-3" aria-label={c.label}>
                  <header className="mb-3 flex items-center gap-2 px-1">
                    <span className={cn('h-2.5 w-2.5 rounded-full', c.tone)} style={{ boxShadow: 'inset 0 0 0 2px rgb(var(--line-strong))' }} />
                    <h2 className="text-sm font-bold">{c.label}</h2>
                    <span className="num rounded-full bg-surface px-2 text-xs font-bold text-muted">{list.length}</span>
                    <span className="ml-auto text-[11px] text-subtle">{c.hint}</span>
                  </header>
                  <div className="flex flex-col gap-3">
                    {list.map(card)}
                    {list.length === 0 && <p className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-xs text-subtle">Nothing here</p>}
                    {c.status === 'draft' && (
                      <button onClick={() => nav('/onboarding/offer/new')} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-semibold text-subtle hover:border-primary hover:text-primary-ink">
                        <FilePlus2 className="h-4 w-4" /> New offer
                      </button>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'onboarding' && (
        joiners.length === 0 ? <div className="card"><EmptyState icon={<UserPlus className="h-5 w-5" />} title="No one is joining soon" body="Accepted offers move here once you start onboarding." /></div> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {joiners.map((e) => {
              const hasAsset = assets.some((a) => a.assignedTo === e.id && a.category === 'Laptop')
              const steps = [
                { label: 'Offer accepted', done: true },
                { label: 'Login created & invite sent', done: true },
                { label: 'Personal & bank details', done: !!e.bank.account },
                { label: 'Documents uploaded (PAN, Aadhaar)', done: e.documents.pan && e.documents.aadhaar },
                { label: 'Laptop assigned', done: hasAsset, action: !hasAsset ? <Link to={`/people/${e.id}?tab=assets`} className="text-xs font-bold text-accent-ink hover:underline">Assign</Link> : null },
                { label: 'Policies accepted', done: e.documents.signature },
              ]
              const done = steps.filter((s) => s.done).length
              const days = diffDays(today(), e.joinDate)
              return (
                <article key={e.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={e.name} hue={e.avatarHue} size={44} />
                    <div className="min-w-0 flex-1"><Link to={`/people/${e.id}`} className="font-bold hover:underline">{e.name}</Link><p className="text-sm text-subtle">{e.designation} · {e.department}</p></div>
                    <div className="text-right"><p className="text-xs text-subtle">Joins</p><p className="text-sm font-bold">{fmtDate(e.joinDate)}</p><p className={cn('text-xs font-semibold', days <= 3 ? 'text-primary-ink' : 'text-subtle')}>{days > 0 ? `in ${days} days` : days === 0 ? 'today' : `${-days} days ago`}</p></div>
                  </div>
                  <div className="mt-4 flex items-center gap-3"><Progress value={(done / steps.length) * 100} tone={done === steps.length ? 'success' : 'orange'} /><span className="num text-sm font-bold">{done}/{steps.length}</span></div>
                  <ul className="mt-4 flex flex-col gap-2">
                    {steps.map((s) => (
                      <li key={s.label} className="flex items-center gap-2.5 text-sm">
                        {s.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-line-strong" />}
                        <span className={cn('flex-1', s.done ? 'text-muted line-through decoration-line-strong' : 'font-medium')}>{s.label}</span>
                        {s.action}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-2 border-t border-line pt-4">
                    <Button size="sm" onClick={() => toast.success(`Reminder sent to ${e.name}`)}>Nudge {e.name.split(' ')[0]}</Button>
                    <Button size="sm" variant="soft" onClick={async () => { await api.employees.setStatus([e.id], 'active'); toast.success(`${e.name} is now active`) }}>Mark as joined</Button>
                  </div>
                </article>
              )
            })}
          </div>
        )
      )}

      <UploadOfferModal open={upload} onClose={() => setUpload(false)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete offer for ${del?.candidateName}?`} body="The letter and its history will be removed."
        onConfirm={async () => { await api.offers.remove(del!.id); setDel(null); toast.success('Offer deleted') }} />
    </>
  )
}

function UploadOfferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const departments = useDb((db) => db.departments.map((d) => d.name))
  const [f, setF] = useState({ candidateName: '', email: '', designation: '', department: '', joinDate: today(), gross: '', file: [] as string[] })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Upload a signed offer" description="Already have a signed PDF from outside the HRMS? Keep it on record here." icon={<FileUp className="h-5 w-5" />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => {
        if (!f.candidateName || !f.email || !f.file.length) { setErr('Name, email and the PDF are required.'); return }
        setBusy(true)
        const g = Number(f.gross) || 0
        await api.offers.save({ candidateName: f.candidateName, email: f.email, designation: f.designation, department: f.department || departments[0]!, joinDate: f.joinDate, reportingTo: '', reportingDesignation: '', salary: { basic: Math.round(g * 0.5), hra: Math.round(g * 0.2), special: g - Math.round(g * 0.5) - Math.round(g * 0.2), employeePf: 0, employerPf: 0 }, terms: [], status: 'accepted', source: 'uploaded', respondedAt: today() })
        setBusy(false); toast.success('Signed offer saved'); onClose()
      }}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><FileDrop label="Signed offer letter (PDF)" accept="application/pdf" value={f.file} onChange={(n) => setF({ ...f, file: n })} /></div>
        <Field label="Candidate name" required><Input value={f.candidateName} onChange={(e) => setF({ ...f, candidateName: e.target.value })} /></Field>
        <Field label="Email" required><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Designation"><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></Field>
        <Field label="Department"><Select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} options={[{ value: '', label: 'Select' }, ...departments]} /></Field>
        <Field label="Date of joining"><Input type="date" value={f.joinDate} onChange={(e) => setF({ ...f, joinDate: e.target.value })} /></Field>
        <Field label="Monthly gross (₹)"><Input type="number" value={f.gross} onChange={(e) => setF({ ...f, gross: e.target.value })} /></Field>
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-danger">{err}</p>}
    </Modal>
  )
}
