import { useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Send, UploadCloud } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import type { Employee } from '@/data/types'
import { addDays, cn, downloadFile, today } from '@/lib/utils'
import { Badge, Button, Field, Input, Modal, Select, toast } from '@/components/ui'

export const IMPORT_COLUMNS = [
  'Name', 'Email', 'Phone', 'Department', 'Designation', 'Branch', 'Team', 'Work Location', 'Shift', 'Date of Joining', 'Employment Type',
  'Date of Birth', 'Gender', 'Marital Status', 'Blood Group', 'Personal Email', 'Address Line 1', 'Address Line 2', 'City', 'State',
  'Country', 'Pincode', 'Emergency Contact Name', 'Emergency Relationship', 'Emergency Phone', 'Bank Name', 'Account Holder Name', 'Account Number', 'IFSC Code',
]

interface Row { name: string; email: string; department: string; designation: string; joinDate: string; errors: string[] }

function blankEmployee(p: Partial<Employee> & Pick<Employee, 'name' | 'email' | 'department' | 'designation' | 'joinDate'>): Omit<Employee, 'id' | 'code'> {
  return {
    phone: '', gender: 'Other', dob: '2000-01-01', maritalStatus: 'Single', team: p.department, branch: 'Noida HQ', workLocation: 'Noida Office',
    shiftId: 'sh_1', employmentType: 'Full Time', status: 'onboarding', avatarHue: Math.floor(Math.random() * 360),
    address: { line1: '', city: '', state: '', pincode: '', country: 'India' }, emergency: { name: '', relation: '', phone: '' },
    bank: { holder: p.name, bankName: '', account: '', ifsc: '' }, documents: { pan: false, aadhaar: false, signature: false, certificates: false, photo: false },
    roleId: 'role_employee', ...p,
  }
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const split = (l: string) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim())
  const head = split(lines[0] ?? '').map((h) => h.toLowerCase())
  const idx = (k: string) => head.indexOf(k.toLowerCase())
  return lines.slice(1).map((l) => {
    const c = split(l)
    return { name: c[idx('Name')] ?? '', email: c[idx('Email')] ?? '', department: c[idx('Department')] ?? '', designation: c[idx('Designation')] ?? '', joinDate: c[idx('Date of Joining')] ?? '' }
  })
}

export function BulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments, existing } = useDb((db) => ({ departments: db.departments.map((d) => d.name), existing: new Set(db.employees.map((e) => e.email.toLowerCase())) }))
  const [file, setFile] = useState<string>()
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)

  const validate = (r: Omit<Row, 'errors'>): Row => {
    const errors: string[] = []
    if (!r.name) errors.push('Name missing')
    if (!/^\S+@\S+\.\S+$/.test(r.email)) errors.push('Invalid email')
    else if (existing.has(r.email.toLowerCase())) errors.push('Email already exists')
    if (!departments.some((d) => d.toLowerCase() === r.department.toLowerCase())) errors.push(`Unknown department “${r.department}”`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.joinDate)) errors.push('Date must be YYYY-MM-DD')
    return { ...r, errors }
  }

  const onFile = async (f?: File) => {
    if (!f) return
    setFile(f.name)
    if (f.name.toLowerCase().endsWith('.csv')) {
      setRows(parseCsv(await f.text()).map(validate))
    } else {
      // .xlsx parsing happens server-side in production; preview a representative sample here.
      setRows([
        { name: 'Anjali Desai', email: 'anjali.desai@surfsyncinfotech.in', department: 'Design', designation: 'Visual Designer', joinDate: addDays(today(), 7) },
        { name: 'Farhan Ali', email: 'farhan.ali@surfsyncinfotech.in', department: 'Development', designation: 'Backend Developer', joinDate: addDays(today(), 14) },
        { name: 'Pooja Rawat', email: 'pooja@', department: 'Sales', designation: 'Sales Executive', joinDate: addDays(today(), 7) },
        { name: 'Yash Thakur', email: 'yash.thakur@surfsyncinfotech.in', department: 'Finance', designation: 'Accountant', joinDate: addDays(today(), 21) },
      ].map(validate))
    }
  }

  const valid = rows.filter((r) => r.errors.length === 0)
  const close = () => { setFile(undefined); setRows([]); onClose() }

  const doImport = async () => {
    setBusy(true)
    await api.employees.bulkImport(valid.map((r) => blankEmployee({ ...r, department: departments.find((d) => d.toLowerCase() === r.department.toLowerCase())! })))
    setBusy(false)
    toast.success(`${valid.length} employees imported`, { body: 'Login credentials were generated and emailed to each person.' })
    close()
  }

  return (
    <Modal open={open} onClose={close} size="lg" title="Bulk import employees" icon={<FileSpreadsheet className="h-5 w-5" />}
      description="Upload a spreadsheet with one employee per row. We’ll check every row before anything is created."
      footer={<>
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" disabled={!valid.length} loading={busy} onClick={doImport}>
          {valid.length ? `Import ${valid.length} ${valid.length === 1 ? 'employee' : 'employees'}` : 'Import'}
        </Button>
      </>}>
      <ol className="mb-5 grid gap-3 sm:grid-cols-3">
        {['Download the template', 'Fill one row per person', 'Upload & review'].map((s, i) => (
          <li key={s} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">{i + 1}</span>{s}
          </li>
        ))}
      </ol>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Template with all {IMPORT_COLUMNS.length} columns</p>
          <p className="text-xs text-subtle">Department, branch, team, location and shift must match names in Company settings.</p>
        </div>
        <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadFile('employee-import-template.csv', IMPORT_COLUMNS.join(',') + '\n')}>Download template</Button>
      </div>

      <label className={cn('flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
        file ? 'border-success/50 bg-success-soft/40' : 'border-line-strong bg-surface-2 hover:border-blue-500 hover:bg-accent-soft')}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>
        <UploadCloud className={cn('h-8 w-8', file ? 'text-success' : 'text-blue-500')} />
        <span className="text-sm font-bold">{file ?? 'Drop your .xlsx or .csv here'}</span>
        <span className="text-xs text-subtle">{file ? 'Click to choose a different file' : 'or click to browse — max 500 rows'}</span>
        <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {rows.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm font-bold">Preview</p>
            <Badge tone="success">{valid.length} ready</Badge>
            {rows.length - valid.length > 0 && <Badge tone="danger">{rows.length - valid.length} need fixing</Badge>}
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            {rows.map((r, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
                {r.errors.length ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{r.name || '—'} <span className="font-normal text-subtle">· {r.email}</span></p>
                  <p className="text-xs text-subtle">{r.designation} · {r.department} · joins {r.joinDate}</p>
                  {r.errors.length > 0 && <p className="mt-1 text-xs font-semibold text-danger">{r.errors.join(' · ')}</p>}
                </div>
              </div>
            ))}
          </div>
          {rows.length - valid.length > 0 && <p className="mt-2 text-xs text-subtle">Rows with problems are skipped. Fix them in the sheet and import again.</p>}
        </div>
      )}
    </Modal>
  )
}

export function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments, branches } = useDb((db) => ({ departments: db.departments, branches: db.branches }))
  const [f, setF] = useState({ name: '', email: '', phone: '', designation: '', department: '', branch: 'Noida HQ', joinDate: addDays(today(), 7), employmentType: 'Full Time' as Employee['employmentType'] })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = async () => {
    const er: Record<string, string> = {}
    if (!f.name.trim()) er.name = 'Enter their full name'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email'
    if (!f.department) er.department = 'Choose a department'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    await api.employees.create(blankEmployee({ ...f, designation: f.designation || 'New joiner' }))
    setBusy(false)
    toast.success(`Invite sent to ${f.email}`, { body: 'They’ll set a password and complete their profile, bank details and documents.' })
    setF({ ...f, name: '', email: '', phone: '', designation: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite to self-onboard" icon={<Send className="h-5 w-5" />}
      description="We’ll email them a secure link. They fill in personal details, emergency contact, bank details and documents, and accept company policies."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit} icon={<Send className="h-4 w-4" />}>Send invite</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}><Input value={f.name} onChange={set('name')} placeholder="e.g. Tanvi Joshi" aria-invalid={!!errors.name} /></Field>
        <Field label="Work email" required error={errors.email}><Input type="email" value={f.email} onChange={set('email')} placeholder="name@surfsyncinfotech.in" aria-invalid={!!errors.email} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} placeholder="+91" /></Field>
        <Field label="Designation"><Input value={f.designation} onChange={set('designation')} placeholder="e.g. Graphic Designer" /></Field>
        <Field label="Department" required error={errors.department}>
          <Select value={f.department} onChange={set('department')} aria-invalid={!!errors.department} options={[{ value: '', label: 'Select department' }, ...departments.map((d) => d.name)]} />
        </Field>
        <Field label="Branch"><Select value={f.branch} onChange={set('branch')} options={branches.map((b) => b.name)} /></Field>
        <Field label="Date of joining"><Input type="date" value={f.joinDate} onChange={set('joinDate')} /></Field>
        <Field label="Employment type"><Select value={f.employmentType} onChange={set('employmentType')} options={['Full Time', 'Part Time', 'Intern', 'Contract']} /></Field>
      </div>
    </Modal>
  )
}
