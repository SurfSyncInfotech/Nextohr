import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Briefcase, Check, Contact, KeyRound, Landmark, ShieldCheck } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import type { Employee } from '@/data/types'
import { addDays, cn, fmtDate, today } from '@/lib/utils'
import { Avatar, Button, Checkbox, Field, FileDrop, Input, Select, StatusBadge, toast } from '@/components/ui'

const STEPS = [
  { key: 'basics', label: 'Basics & login', icon: KeyRound },
  { key: 'job', label: 'Job details', icon: Briefcase },
  { key: 'personal', label: 'Personal', icon: Contact },
  { key: 'bank', label: 'Bank & documents', icon: Landmark },
] as const

type Form = Omit<Employee, 'id' | 'code'> & { sendInvite: boolean; password: string }

const empty = (): Form => ({
  name: '', email: '', phone: '', gender: 'Male', dob: '', maritalStatus: 'Single', bloodGroup: '', personalEmail: '',
  department: '', designation: '', team: '', branch: 'Noida HQ', workLocation: 'Noida Office', shiftId: 'sh_1', employmentType: 'Full Time',
  joinDate: addDays(today(), 7), managerId: '', status: 'onboarding', avatarHue: Math.floor(Math.random() * 360),
  address: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' }, emergency: { name: '', relation: '', phone: '' },
  bank: { holder: '', bankName: '', account: '', ifsc: '' }, documents: { pan: false, aadhaar: false, signature: false, certificates: false, photo: false },
  roleId: 'role_employee', sendInvite: true, password: '',
})

export default function EmployeeForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const db = useDb((d) => ({ emp: d.employees.find((e) => e.id === id), all: d.employees, departments: d.departments, teams: d.teams, branches: d.branches, locations: d.workLocations, shifts: d.shifts, roles: d.roles, nextCode: `EMP-${String(d.employees.length + 1).padStart(4, '0')}` }), [id])
  const editing = !!db.emp
  const [step, setStep] = useState(0)
  const [f, setF] = useState<Form>(() => (db.emp ? { ...db.emp, sendInvite: false, password: '' } : empty()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [docs, setDocs] = useState<Record<string, string[]>>({})

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const setIn = <K extends 'address' | 'emergency' | 'bank'>(k: K, field: keyof Form[K], v: string) => setF((p) => ({ ...p, [k]: { ...p[k], [field]: v } }))
  const teams = useMemo(() => db.teams.filter((t) => !f.department || t.department === f.department || t.name === f.department), [db.teams, f.department])

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!f.name.trim()) e.name = 'Full name is required'
      if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address'
      else if (db.all.some((x) => x.email.toLowerCase() === f.email.toLowerCase() && x.id !== id)) e.email = 'Someone already uses this email'
      if (f.phone && !/^[+\d\s-]{8,}$/.test(f.phone)) e.phone = 'Enter a valid phone number'
    }
    if (s === 1) {
      if (!f.department) e.department = 'Choose a department'
      if (!f.designation.trim()) e.designation = 'Designation is required'
      if (!f.joinDate) e.joinDate = 'Pick the date of joining'
    }
    if (s === 3 && f.bank.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.bank.ifsc.toUpperCase())) e.ifsc = 'IFSC looks like HDFC0001234'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validate(step)) setStep((s) => Math.min(STEPS.length - 1, s + 1)) }
  const goTo = (i: number) => { if (i < step || validate(step)) setStep(i) }

  const save = async () => {
    for (let s = 0; s < STEPS.length; s++) if (!validate(s)) { setStep(s); return }
    setBusy(true)
    const { sendInvite, password, ...rest } = f
    void password
    const payload = { ...rest, team: rest.team || rest.department, managerId: rest.managerId || undefined,
      bank: { ...rest.bank, holder: rest.bank.holder || rest.name, ifsc: rest.bank.ifsc.toUpperCase() },
      documents: { ...rest.documents, ...Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.length > 0])) } }
    if (editing) {
      await api.employees.update(id!, payload)
      toast.success('Changes saved')
      nav(`/people/${id}`)
    } else {
      const newId = await api.employees.create(payload)
      toast.success(`${f.name} added`, { body: sendInvite ? `Login details sent to ${f.email}` : 'No invite sent yet — you can send it from their profile.' })
      nav(`/people/${newId}`)
    }
    setBusy(false)
  }

  const S = STEPS[step]!
  return (
    <div className="mx-auto max-w-6xl">
      <Link to={editing ? `/people/${id}` : '/people'} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {editing ? 'Back to profile' : 'Employees'}
      </Link>
      <h1 className="text-[26px] font-extrabold tracking-tight">{editing ? `Edit ${db.emp!.name}` : 'Add an employee'}</h1>
      <p className="mt-1 text-sm text-subtle">{editing ? 'Update any section and save.' : 'Only the first two steps are required — the rest can be completed later by you or the employee.'}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr_300px]">
        {/* stepper */}
        <nav aria-label="Form steps" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {STEPS.map((s, i) => {
            const done = i < step
            return (
              <button key={s.key} onClick={() => goTo(i)} aria-current={i === step ? 'step' : undefined}
                className={cn('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                  i === step ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-muted hover:bg-surface-3')}>
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  done ? 'bg-success text-white' : i === step ? 'bg-primary text-on-primary' : 'bg-surface-3 text-subtle')}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span>{s.label}{i >= 2 && <span className="block text-[11px] font-medium text-subtle">Optional</span>}</span>
              </button>
            )
          })}
        </nav>

        {/* form body */}
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-ink"><S.icon className="h-5 w-5" /></span>
            <div><h2 className="text-lg font-bold">{S.label}</h2><p className="text-xs text-subtle">Step {step + 1} of {STEPS.length}</p></div>
          </div>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rohan Gupta" aria-invalid={!!errors.name} autoFocus /></Field>
              <Field label="Work email (login)" required error={errors.email}><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@surfsyncinfotech.in" aria-invalid={!!errors.email} /></Field>
              <Field label="Phone" error={errors.phone}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98xxxxxxx" aria-invalid={!!errors.phone} /></Field>
              <Field label="Employee ID" hint="Generated automatically"><Input value={editing ? db.emp!.code : db.nextCode} disabled /></Field>
              <Field label="Access role" hint="Controls what they can see in the HRMS">
                <Select value={f.roleId} onChange={(e) => set('roleId', e.target.value)} options={db.roles.map((r) => ({ value: r.id, label: r.name }))} />
              </Field>
              {!editing && (
                <>
                  <Field label="Password" hint="Leave blank to auto-generate a secure one" className="sm:col-span-2"><Input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Auto-generate" autoComplete="new-password" /></Field>
                  <Checkbox className="sm:col-span-2" checked={f.sendInvite} onChange={(v) => set('sendInvite', v)} label="Email login details when I save" description="They’ll be asked to reset their password and accept company policies on first sign-in." />
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" required error={errors.department}>
                <Select value={f.department} onChange={(e) => setF((p) => ({ ...p, department: e.target.value, team: '' }))} aria-invalid={!!errors.department} options={[{ value: '', label: 'Select department' }, ...db.departments.map((d) => d.name)]} />
              </Field>
              <Field label="Designation" required error={errors.designation}><Input value={f.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Software Engineer" aria-invalid={!!errors.designation} /></Field>
              <Field label="Team"><Select value={f.team} onChange={(e) => set('team', e.target.value)} options={[{ value: '', label: 'Same as department' }, ...teams.map((t) => t.name)]} /></Field>
              <Field label="Reports to"><Select value={f.managerId ?? ''} onChange={(e) => set('managerId', e.target.value)} options={[{ value: '', label: 'No manager' }, ...db.all.filter((e) => e.id !== id && e.status === 'active').map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))]} /></Field>
              <Field label="Branch"><Select value={f.branch} onChange={(e) => set('branch', e.target.value)} options={db.branches.map((b) => b.name)} /></Field>
              <Field label="Work location" hint="Used for GPS check-in geofence"><Select value={f.workLocation} onChange={(e) => set('workLocation', e.target.value)} options={db.locations.map((l) => l.name)} /></Field>
              <Field label="Shift"><Select value={f.shiftId} onChange={(e) => set('shiftId', e.target.value)} options={db.shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.start}–${s.end})` }))} /></Field>
              <Field label="Employment type"><Select value={f.employmentType} onChange={(e) => set('employmentType', e.target.value as Employee['employmentType'])} options={['Full Time', 'Part Time', 'Intern', 'Contract']} /></Field>
              <Field label="Date of joining" required error={errors.joinDate}><Input type="date" value={f.joinDate} onChange={(e) => set('joinDate', e.target.value)} /></Field>
              {editing && <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value as Employee['status'])} options={[{ value: 'active', label: 'Active' }, { value: 'onboarding', label: 'Onboarding' }, { value: 'notice', label: 'On notice' }, { value: 'inactive', label: 'Inactive' }]} /></Field>}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FileDrop label="Profile photo" accept="image/*" value={docs.photo} onChange={(n) => setDocs({ ...docs, photo: n })} hint="JPG or PNG, square works best" />
              <div />
              <Field label="Date of birth"><Input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
              <Field label="Gender"><Select value={f.gender} onChange={(e) => set('gender', e.target.value as Employee['gender'])} options={['Male', 'Female', 'Other']} /></Field>
              <Field label="Marital status"><Select value={f.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value as Employee['maritalStatus'])} options={['Single', 'Married']} /></Field>
              <Field label="Blood group"><Select value={f.bloodGroup ?? ''} onChange={(e) => set('bloodGroup', e.target.value)} options={['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((v) => ({ value: v, label: v || 'Select' }))} /></Field>
              <Field label="Personal email" className="sm:col-span-2"><Input type="email" value={f.personalEmail ?? ''} onChange={(e) => set('personalEmail', e.target.value)} /></Field>
              <p className="label-xs pt-2 sm:col-span-2">Address</p>
              <Field label="Address line 1" className="sm:col-span-2"><Input value={f.address.line1} onChange={(e) => setIn('address', 'line1', e.target.value)} /></Field>
              <Field label="City"><Input value={f.address.city} onChange={(e) => setIn('address', 'city', e.target.value)} /></Field>
              <Field label="State"><Input value={f.address.state} onChange={(e) => setIn('address', 'state', e.target.value)} /></Field>
              <Field label="Pincode"><Input inputMode="numeric" value={f.address.pincode} onChange={(e) => setIn('address', 'pincode', e.target.value)} /></Field>
              <Field label="Country"><Input value={f.address.country} onChange={(e) => setIn('address', 'country', e.target.value)} /></Field>
              <p className="label-xs pt-2 sm:col-span-2">Emergency contact</p>
              <Field label="Name"><Input value={f.emergency.name} onChange={(e) => setIn('emergency', 'name', e.target.value)} /></Field>
              <Field label="Relationship"><Select value={f.emergency.relation} onChange={(e) => setIn('emergency', 'relation', e.target.value)} options={['', 'Father', 'Mother', 'Spouse', 'Sibling', 'Friend', 'Other'].map((v) => ({ value: v, label: v || 'Select' }))} /></Field>
              <Field label="Phone"><Input value={f.emergency.phone} onChange={(e) => setIn('emergency', 'phone', e.target.value)} /></Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank name"><Input value={f.bank.bankName} onChange={(e) => setIn('bank', 'bankName', e.target.value)} placeholder="e.g. HDFC Bank" /></Field>
              <Field label="Account holder"><Input value={f.bank.holder} onChange={(e) => setIn('bank', 'holder', e.target.value)} placeholder={f.name || 'As per bank records'} /></Field>
              <Field label="Account number"><Input inputMode="numeric" value={f.bank.account} onChange={(e) => setIn('bank', 'account', e.target.value)} /></Field>
              <Field label="IFSC code" error={errors.ifsc}><Input value={f.bank.ifsc} onChange={(e) => setIn('bank', 'ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" aria-invalid={!!errors.ifsc} /></Field>
              <p className="label-xs pt-2 sm:col-span-2">Documents</p>
              <FileDrop label="PAN card" value={docs.pan} onChange={(n) => setDocs({ ...docs, pan: n })} hint={f.documents.pan ? 'On file — upload to replace' : undefined} />
              <FileDrop label="Aadhaar card" value={docs.aadhaar} onChange={(n) => setDocs({ ...docs, aadhaar: n })} hint={f.documents.aadhaar ? 'On file — upload to replace' : undefined} />
              <FileDrop label="Signature" accept="image/*" value={docs.signature} onChange={(n) => setDocs({ ...docs, signature: n })} hint={f.documents.signature ? 'On file — upload to replace' : undefined} />
              <FileDrop label="Educational certificates" multiple value={docs.certificates} onChange={(n) => setDocs({ ...docs, certificates: n })} hint={f.documents.certificates ? 'On file — upload to add more' : 'You can select several files'} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="ghost" onClick={() => (step === 0 ? nav(-1) : setStep(step - 1))} icon={<ArrowLeft className="h-4 w-4" />}>{step === 0 ? 'Cancel' : 'Back'}</Button>
            <div className="flex gap-2">
              {(editing || step >= 1) && step < STEPS.length - 1 && <Button onClick={save} loading={busy}>{editing ? 'Save changes' : 'Save & finish later'}</Button>}
              {step < STEPS.length - 1
                ? <Button variant="primary" onClick={next} iconRight={<ArrowRight className="h-4 w-4" />}>Continue</Button>
                : <Button variant="primary" onClick={save} loading={busy} icon={<Check className="h-4 w-4" />}>{editing ? 'Save changes' : 'Add employee'}</Button>}
            </div>
          </div>
        </section>

        {/* live summary */}
        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <p className="label-xs mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <Avatar name={f.name || 'New Employee'} hue={f.avatarHue} size={48} />
              <div className="min-w-0">
                <p className="truncate font-bold">{f.name || 'New employee'}</p>
                <p className="truncate text-sm text-subtle">{f.designation || 'Designation'}</p>
              </div>
            </div>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              {[['Department', f.department], ['Email', f.email], ['Joins', f.joinDate && fmtDate(f.joinDate)], ['Type', f.employmentType], ['Branch', f.branch]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-subtle">{k}</dt><dd className="truncate text-right font-semibold">{v || '—'}</dd></div>
              ))}
              <div className="flex justify-between"><dt className="text-subtle">Status</dt><dd><StatusBadge status={f.status} /></dd></div>
            </dl>
          </div>
          {!editing && (
            <div className="rounded-2xl border border-line bg-accent-soft/60 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-accent-ink"><ShieldCheck className="h-4 w-4" /> What happens next</p>
              <ul className="mt-3 flex flex-col gap-2 text-[13px] text-muted">
                <li>• A salary structure is created — fill it in under Payroll.</li>
                <li>• They appear as <b>Onboarding</b> until their first check-in.</li>
                <li>• Missing details show as a checklist on their profile.</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
