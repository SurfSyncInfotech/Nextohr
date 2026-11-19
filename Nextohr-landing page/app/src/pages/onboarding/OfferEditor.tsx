import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, PenLine, Plus, Printer, RotateCcw, Save, Send, Trash2 } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import type { OfferLetter } from '@/data/types'
import { addDays, cn, fmtDate, money, today } from '@/lib/utils'
import { grossOf } from '@/lib/payroll'
import logo from '@/assets/logo.jpg'
import { Button, Card, Field, IconButton, Input, Segmented, Select, StatusBadge, Textarea, toast } from '@/components/ui'

const DEFAULT_TERMS = [
  "Probation: You will be on probation for a period of three (3) months from your date of joining, which may be extended at the company's discretion. On successful completion, your employment will be confirmed in writing.",
  'Working Hours: Standard working days are Monday to Saturday, with office hours from 9:00 AM to 6:00 PM. You may occasionally be required to work additional hours to meet project deadlines.',
  'Notice Period: Either party may terminate this employment by serving one (1) month written notice, or salary in lieu thereof, subject to management approval.',
  'Confidentiality & IP: You shall maintain strict confidentiality of all company and client information, source code and business data, during and after your employment.',
  'Exclusivity: You shall not engage in any other employment, freelance work or business that conflicts with the interests of the company without prior written approval.',
  'Documents: This offer is contingent upon satisfactory verification of your documents — educational certificates, government photo ID (Aadhaar/PAN), relieving letter (if any) and bank details.',
  'Validity: Kindly confirm your acceptance by signing and returning a copy of this letter within seven (7) days, failing which this offer may stand withdrawn.',
]
const MAX_TERMS = 8

type Draft = Omit<OfferLetter, 'id' | 'createdAt'> & { id?: string }

export default function OfferEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { existing, departments, people, company, pfOn } = useDb((db) => ({
    existing: db.offers.find((o) => o.id === id), departments: db.departments.map((d) => d.name),
    people: db.employees.filter((e) => e.status === 'active'), company: db.company, pfOn: db.statutory.pfEnabled,
  }), [id])
  const isNew = id === 'new'
  const [f, setF] = useState<Draft>(() => existing ?? {
    candidateName: '', email: '', phone: '', designation: '', department: '', joinDate: addDays(today(), 14), reportingTo: '', reportingDesignation: '',
    salary: { basic: 15000, hra: 6000, special: 4000, employeePf: 1800, employerPf: 1800 }, terms: DEFAULT_TERMS, status: 'draft', source: 'generated',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'send' | null>(null)
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  useEffect(() => { if (existing) setF(existing) }, [existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isNew && !existing) return <Card><p className="text-sm">Offer not found. <Link className="font-bold text-accent-ink" to="/onboarding">Back to hiring</Link></p></Card>
  const locked = f.status !== 'draft'
  const sal = f.salary
  const setSal = (k: keyof typeof sal, v: number) => {
    const next = { ...sal, [k]: v }
    if (k === 'basic' && pfOn) { const pf = Math.round(Math.min(v, 15000) * 0.12); next.employeePf = pf; next.employerPf = pf }
    setF({ ...f, salary: next })
  }
  const gross = grossOf(sal)
  const inHand = gross - sal.employeePf
  const ctc = (gross + sal.employerPf) * 12

  const validate = () => {
    const e: Record<string, string> = {}
    if (!f.candidateName.trim()) e.candidateName = 'Candidate name is required'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email'
    if (!f.designation.trim()) e.designation = 'Designation is required'
    if (!f.department) e.department = 'Choose a department'
    if (!f.reportingTo.trim()) e.reportingTo = 'Who will they report to?'
    if (sal.basic <= 0) e.basic = 'Basic must be more than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const save = async (send: boolean) => {
    if (!validate()) { toast.error('Please fix the highlighted fields'); return }
    setBusy(send ? 'send' : 'save')
    const newId = await api.offers.save({ ...f, status: send ? 'sent' : 'draft', sentAt: send ? today() : undefined })
    setBusy(null)
    toast.success(send ? `Offer sent to ${f.email}` : 'Draft saved', { body: send ? 'You’ll be notified when they open or respond.' : undefined })
    if (send) nav('/onboarding'); else if (isNew) nav(`/onboarding/offer/${newId}`, { replace: true })
  }
  const moveTerm = (i: number, d: -1 | 1) => { const t = [...f.terms]; [t[i], t[i + d]] = [t[i + d]!, t[i]!]; setF({ ...f, terms: t }) }

  const form = (
    <div className="flex flex-col gap-4">
      <Card title="Candidate & role">
        <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
          <Field label="Candidate name" required error={errors.candidateName}><Input value={f.candidateName} onChange={(e) => setF({ ...f, candidateName: e.target.value })} placeholder="Full name as per ID" /></Field>
          <Field label="Email" required error={errors.email}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Designation" required error={errors.designation}><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} placeholder="e.g. Full Stack Developer" /></Field>
          <Field label="Department" required error={errors.department}><Select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} options={[{ value: '', label: 'Select department' }, ...departments]} /></Field>
          <Field label="Date of joining"><Input type="date" value={f.joinDate} onChange={(e) => setF({ ...f, joinDate: e.target.value })} /></Field>
          <Field label="Reporting to" required error={errors.reportingTo}>
            <Select value={f.reportingTo} onChange={(e) => { const p = people.find((x) => x.name === e.target.value); setF({ ...f, reportingTo: e.target.value, reportingDesignation: p?.designation ?? f.reportingDesignation }) }}
              options={[{ value: '', label: 'Select manager' }, ...people.map((p) => ({ value: p.name, label: `${p.name} — ${p.designation}` }))]} />
          </Field>
        </fieldset>
      </Card>
      <Card title="Monthly salary" subtitle="PF auto-calculates at 12% of basic (capped at ₹15,000).">
        <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-3">
          <Field label="Basic" error={errors.basic}><Input type="number" min={0} value={sal.basic} onChange={(e) => setSal('basic', Number(e.target.value))} /></Field>
          <Field label="HRA"><Input type="number" min={0} value={sal.hra} onChange={(e) => setSal('hra', Number(e.target.value))} /></Field>
          <Field label="Special allowance"><Input type="number" min={0} value={sal.special} onChange={(e) => setSal('special', Number(e.target.value))} /></Field>
          <Field label="Employee PF"><Input type="number" min={0} value={sal.employeePf} onChange={(e) => setSal('employeePf', Number(e.target.value))} /></Field>
          <Field label="Employer PF"><Input type="number" min={0} value={sal.employerPf} onChange={(e) => setSal('employerPf', Number(e.target.value))} /></Field>
        </fieldset>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[['Gross / month', gross], ['In-hand / month', inHand], ['Annual CTC', ctc]].map(([k, v], i) => (
            <div key={k as string} className={cn('rounded-xl p-3', i === 2 ? 'bg-primary-soft' : 'bg-surface-2')}>
              <p className="text-xs font-semibold text-subtle">{k}</p><p className={cn('num text-lg font-extrabold', i === 2 && 'text-primary-ink')}>{money(v as number)}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title={`Terms & conditions (${f.terms.length}/${MAX_TERMS})`} subtitle="Pre-filled with your standard terms. Edit, reorder, remove or add your own."
        action={!locked && <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setF({ ...f, terms: DEFAULT_TERMS })}>Reset</Button>
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} disabled={f.terms.length >= MAX_TERMS} onClick={() => setF({ ...f, terms: [...f.terms, ''] })}>Add term</Button>
        </div>}>
        <ol className="flex flex-col gap-3">
          {f.terms.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2.5 w-5 shrink-0 text-right text-sm font-bold text-subtle">{i + 1}.</span>
              <Textarea disabled={locked} className="min-h-[76px] text-[13px]" value={t} onChange={(e) => { const x = [...f.terms]; x[i] = e.target.value; setF({ ...f, terms: x }) }} placeholder="Write a term…" aria-label={`Term ${i + 1}`} />
              {!locked && (
                <div className="flex flex-col gap-1">
                  <IconButton size="icon-sm" label="Move up" disabled={i === 0} icon={<ArrowUp className="h-3.5 w-3.5" />} onClick={() => moveTerm(i, -1)} />
                  <IconButton size="icon-sm" label="Move down" disabled={i === f.terms.length - 1} icon={<ArrowDown className="h-3.5 w-3.5" />} onClick={() => moveTerm(i, 1)} />
                  <IconButton size="icon-sm" label="Remove term" icon={<Trash2 className="h-3.5 w-3.5 text-danger" />} onClick={() => setF({ ...f, terms: f.terms.filter((_, j) => j !== i) })} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )

  const preview = (
    <div id="offer-letter" className="mx-auto w-full max-w-[720px] rounded-2xl bg-white p-8 text-[13px] leading-relaxed text-[#1f2937] shadow-pop ring-1 ring-black/5 sm:p-10">
      <div className="flex items-start justify-between border-b-2 border-[#F68713] pb-4">
        <img src={logo} alt="SurfSync Infotech" className="h-12 w-auto" />
        <div className="text-right text-[11px] text-gray-500"><p className="font-bold text-gray-700">{company.legalName}</p><p>{company.address.line1}, {company.address.city}</p><p>{company.email} · {company.phone}</p></div>
      </div>
      <p className="mt-6 text-right text-gray-500">{fmtDate(f.sentAt ?? today())}</p>
      <p className="mt-4 font-semibold">{f.candidateName || '[Candidate name]'}</p>
      <p className="text-gray-500">{f.email || '[email]'}</p>
      <h2 className="mt-6 text-center text-base font-extrabold tracking-wide text-[#1D667C]">LETTER OF OFFER</h2>
      <p className="mt-4">Dear {f.candidateName.split(' ')[0] || 'Candidate'},</p>
      <p className="mt-3">We are delighted to offer you the position of <b>{f.designation || '[Designation]'}</b> in our <b>{f.department || '[Department]'}</b> team at {company.name}. Your date of joining will be <b>{fmtDate(f.joinDate)}</b> and you will report to <b>{f.reportingTo || '[Manager]'}</b>{f.reportingDesignation && `, ${f.reportingDesignation}`}.</p>
      <p className="mt-3">Your annual cost to company will be <b>{money(ctc)}</b>, structured monthly as follows:</p>
      <table className="mt-3 w-full border-collapse text-[12px]">
        <tbody>
          {[['Basic salary', sal.basic], ['House rent allowance', sal.hra], ['Special allowance', sal.special]].map(([k, v]) => (
            <tr key={k as string} className="border-b border-gray-100"><td className="py-1.5">{k}</td><td className="py-1.5 text-right tabular-nums">{money(v as number)}</td></tr>
          ))}
          <tr className="border-b border-gray-200 font-bold"><td className="py-1.5">Gross monthly salary</td><td className="py-1.5 text-right tabular-nums">{money(gross)}</td></tr>
          <tr className="border-b border-gray-100"><td className="py-1.5">Employee PF contribution</td><td className="py-1.5 text-right tabular-nums">−{money(sal.employeePf)}</td></tr>
          <tr className="font-bold text-[#1D667C]"><td className="py-1.5">Estimated in-hand</td><td className="py-1.5 text-right tabular-nums">{money(inHand)}</td></tr>
        </tbody>
      </table>
      <p className="mt-5 font-bold">Terms & conditions</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5">{f.terms.filter((t) => t.trim()).map((t, i) => <li key={i}>{t}</li>)}</ol>
      <p className="mt-5">We look forward to having you on board.</p>
      <div className="mt-8 flex justify-between gap-6">
        <div><p className="font-semibold">For {company.name}</p><p className="mt-8 border-t border-gray-300 pt-1 text-gray-500">Authorised signatory</p></div>
        <div className="text-right"><p className="font-semibold">Accepted by</p><p className="mt-8 border-t border-gray-300 pt-1 text-gray-500">{f.candidateName || 'Candidate'} · Date</p></div>
      </div>
    </div>
  )

  return (
    <div>
      <style>{`@media print { body * { visibility: hidden } #offer-letter, #offer-letter * { visibility: visible } #offer-letter { position: absolute; left: 0; top: 0; box-shadow: none; } }`}</style>
      <Link to="/onboarding" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink"><ArrowLeft className="h-4 w-4" /> Hiring & onboarding</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-[26px] font-extrabold tracking-tight">{isNew ? 'New offer letter' : f.candidateName}</h1>{!isNew && <StatusBadge status={f.status} />}</div>
          <p className="mt-1 text-sm text-subtle">{locked ? 'This offer has been sent, so it’s read-only. Duplicate it to make changes.' : 'Edit on the left — the letter updates live on the right.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print / PDF</Button>
          {!locked && <Button icon={<Save className="h-4 w-4" />} loading={busy === 'save'} onClick={() => save(false)}>Save draft</Button>}
          {!locked && <Button variant="primary" icon={<Send className="h-4 w-4" />} loading={busy === 'send'} onClick={() => save(true)}>Send to candidate</Button>}
        </div>
      </div>
      <Segmented className="mb-4 xl:hidden" value={mobileView} onChange={setMobileView} options={[{ value: 'edit', label: <><PenLine className="h-3.5 w-3.5" />Edit</> }, { value: 'preview', label: <><Eye className="h-3.5 w-3.5" />Preview</> }]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn(mobileView === 'preview' && 'hidden xl:block')}>{form}</div>
        <div className={cn('xl:sticky xl:top-24 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto xl:rounded-3xl xl:bg-surface-3 xl:p-6 scroll-thin', mobileView === 'edit' && 'hidden xl:block')}>{preview}</div>
      </div>
    </div>
  )
}
