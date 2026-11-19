// Service layer. Every write the UI performs goes through here and returns a
// Promise, so replacing the bodies with fetch() calls to the real backend is a
// drop-in change. Simulated latency keeps loading states honest in the demo.
import { mutate, getDb, resetDb } from './db'
import type {
  ActivityLog, Announcement, Asset, AttendanceRecord, DB, Employee, Goal, Holiday, LeaveRequest, Mail,
  OfferLetter, PayrollLine, RequestStatus, SalaryStructure, StatutorySettings,
} from './types'
import { addDays, pad, today, uid } from '@/lib/utils'

const wait = (ms = 380) => new Promise((r) => setTimeout(r, ms + Math.random() * 180))

function log(db: DB, text: string, kind: ActivityLog['kind'], actor = 'You') {
  db.activity.unshift({ id: uid('a'), date: new Date().toISOString(), actor, text, kind })
  db.activity = db.activity.slice(0, 60)
}
const nameOf = (db: DB, empId: string) => db.employees.find((e) => e.id === empId)?.name ?? 'employee'

type WithId = { id: string }
type ArrayKeys = { [K in keyof DB]: DB[K] extends WithId[] ? K : never }[keyof DB]

/** Generic create/update/remove for simple settings collections. */
function collection<K extends ArrayKeys>(key: K, prefix: string) {
  type Item = DB[K] extends (infer U)[] ? U : never
  return {
    async create(item: Omit<Item, 'id'>) {
      await wait()
      const id = uid(prefix)
      mutate((db) => { (db[key] as unknown as WithId[]).push({ ...(item as object), id } as WithId) })
      return id
    },
    async update(id: string, patch: Partial<Item>) {
      await wait(250)
      mutate((db) => {
        const arr = db[key] as unknown as WithId[]
        const i = arr.findIndex((x) => x.id === id)
        if (i >= 0) arr[i] = { ...arr[i]!, ...(patch as object) }
      })
    },
    async remove(id: string) {
      await wait(250)
      mutate((db) => { (db as unknown as Record<string, WithId[]>)[key] = (db[key] as unknown as WithId[]).filter((x) => x.id !== id) })
    },
  }
}

export const api = {
  reset: async () => { await wait(500); resetDb() },

  // ---------------- employees ----------------
  employees: {
    async create(data: Omit<Employee, 'id' | 'code'>) {
      await wait(600)
      let id = ''
      mutate((db) => {
        const n = db.employees.length + 1
        id = `emp_${Date.now().toString(36)}`
        db.employees.push({ ...data, id, code: `EMP-${String(n).padStart(4, '0')}` })
        db.salaries.push({ empId: id, basic: 0, hra: 0, special: 0, otherDeductions: 0, tdsMonthly: 0, pfEnabled: false, effectiveFrom: data.joinDate })
        log(db, `added ${data.name} as ${data.designation}`, 'system')
      })
      return id
    },
    async update(id: string, patch: Partial<Employee>) {
      await wait()
      mutate((db) => {
        const e = db.employees.find((x) => x.id === id)
        if (e) Object.assign(e, patch)
      })
    },
    async setStatus(ids: string[], status: Employee['status']) {
      await wait()
      mutate((db) => {
        db.employees.forEach((e) => { if (ids.includes(e.id)) e.status = status })
        log(db, `${status === 'inactive' ? 'deactivated' : 'activated'} ${ids.length === 1 ? nameOf(db, ids[0]!) : `${ids.length} employees`}`, 'system')
      })
    },
    async remove(ids: string[]) {
      await wait()
      mutate((db) => {
        db.employees = db.employees.filter((e) => !ids.includes(e.id))
        db.salaries = db.salaries.filter((s) => !ids.includes(s.empId))
        db.assets.forEach((a) => { if (a.assignedTo && ids.includes(a.assignedTo)) { a.assignedTo = undefined; a.status = 'available' } })
      })
    },
    async bulkImport(rows: Omit<Employee, 'id' | 'code'>[]) {
      await wait(900)
      mutate((db) => {
        rows.forEach((row, i) => {
          const id = `emp_${Date.now().toString(36)}${i}`
          db.employees.push({ ...row, id, code: `EMP-${String(db.employees.length + 1).padStart(4, '0')}` })
        })
        log(db, `imported ${rows.length} employees from Excel`, 'system')
      })
    },
  },

  // ---------------- attendance ----------------
  attendance: {
    async regularize(rec: Omit<AttendanceRecord, 'id'>, note: string) {
      await wait()
      mutate((db) => {
        const id = `att_${rec.empId}_${rec.date}`
        const i = db.attendance.findIndex((a) => a.id === id)
        const next = { ...(i >= 0 ? db.attendance[i] : {}), ...rec, id, note } as AttendanceRecord
        if (i >= 0) db.attendance[i] = next
        else db.attendance.push(next)
        log(db, `regularized attendance for ${nameOf(db, rec.empId)} on ${rec.date}`, 'attendance')
      })
    },
    async remove(id: string) {
      await wait(250)
      mutate((db) => { db.attendance = db.attendance.filter((a) => a.id !== id) })
    },
  },

  // ---------------- leave ----------------
  leaves: {
    async decide(ids: string[], status: RequestStatus, note?: string) {
      await wait()
      mutate((db) => {
        db.leaves.forEach((l) => {
          if (!ids.includes(l.id)) return
          l.status = status
          l.decidedOn = today()
          if (note) l.adminNote = note
          if (status === 'approved') {
            for (let d = l.from; d <= l.to; d = addDays(d, 1)) {
              const rec = db.attendance.find((a) => a.empId === l.empId && a.date === d)
              if (rec && rec.status === 'absent') rec.status = 'leave'
            }
          }
        })
        log(db, `${status} ${ids.length === 1 ? `${nameOf(db, db.leaves.find((l) => l.id === ids[0])!.empId)}'s leave` : `${ids.length} leave requests`}`, 'leave')
      })
    },
    async create(req: Omit<LeaveRequest, 'id' | 'appliedOn'>) {
      await wait()
      mutate((db) => {
        db.leaves.unshift({ ...req, id: uid('lv'), appliedOn: today() })
        log(db, `logged ${req.days} day(s) of leave for ${nameOf(db, req.empId)}`, 'leave')
      })
    },
  },
  leaveTypes: collection('leaveTypes', 'lt'),

  // ---------------- work reports ----------------
  reports: {
    async decide(ids: string[], status: RequestStatus, note?: string) {
      await wait()
      mutate((db) => {
        db.reports.forEach((r) => { if (ids.includes(r.id)) { r.status = status; if (note) r.reviewNote = note } })
        log(db, `${status} ${ids.length === 1 ? 'a work report' : `${ids.length} work reports`}`, 'report')
      })
    },
    async remove(ids: string[]) {
      await wait(250)
      mutate((db) => { db.reports = db.reports.filter((r) => !ids.includes(r.id)) })
    },
  },

  // ---------------- offers ----------------
  offers: {
    async save(offer: Omit<OfferLetter, 'id' | 'createdAt'> & { id?: string }) {
      await wait(500)
      let id = offer.id ?? ''
      mutate((db) => {
        if (offer.id) {
          const i = db.offers.findIndex((o) => o.id === offer.id)
          db.offers[i] = { ...db.offers[i]!, ...offer } as OfferLetter
        } else {
          id = uid('of')
          db.offers.unshift({ ...offer, id, createdAt: today() } as OfferLetter)
        }
        log(db, `${offer.status === 'sent' ? 'sent' : 'saved'} an offer for ${offer.candidateName}`, 'offer')
      })
      return id
    },
    async setStatus(id: string, status: OfferLetter['status']) {
      await wait()
      mutate((db) => {
        const o = db.offers.find((x) => x.id === id)
        if (!o) return
        o.status = status
        if (status === 'sent') o.sentAt = today()
        if (status === 'accepted' || status === 'declined') o.respondedAt = today()
        log(db, `marked ${o.candidateName}'s offer as ${status}`, 'offer')
      })
    },
    async remove(id: string) {
      await wait(250)
      mutate((db) => { db.offers = db.offers.filter((o) => o.id !== id) })
    },
    /** Accepted offer → onboarding employee record with salary structure prefilled. */
    async convert(id: string) {
      await wait(700)
      let empId = ''
      mutate((db) => {
        const o = db.offers.find((x) => x.id === id)
        if (!o) return
        empId = `emp_${Date.now().toString(36)}`
        db.employees.push({
          id: empId, code: `EMP-${String(db.employees.length + 1).padStart(4, '0')}`, name: o.candidateName, email: o.email, phone: o.phone ?? '',
          gender: 'Other', dob: '2000-01-01', maritalStatus: 'Single', department: o.department, designation: o.designation, team: o.department,
          branch: 'Noida HQ', workLocation: 'Noida Office', shiftId: 'sh_1', employmentType: 'Full Time', joinDate: o.joinDate,
          managerId: db.employees.find((e) => e.name === o.reportingTo)?.id, status: 'onboarding', avatarHue: Math.floor(Math.random() * 360),
          address: { line1: '', city: '', state: '', pincode: '', country: 'India' }, emergency: { name: '', relation: '', phone: '' },
          bank: { holder: o.candidateName, bankName: '', account: '', ifsc: '' },
          documents: { pan: false, aadhaar: false, signature: false, certificates: false, photo: false }, roleId: 'role_employee',
        })
        db.salaries.push({ empId, basic: o.salary.basic, hra: o.salary.hra, special: o.salary.special, otherDeductions: 0, tdsMonthly: 0, pfEnabled: o.salary.employeePf > 0, effectiveFrom: o.joinDate })
        o.empId = empId
        o.status = 'accepted'
        log(db, `started onboarding for ${o.candidateName}`, 'offer')
      })
      return empId
    },
  },

  // ---------------- assets ----------------
  assets: {
    async create(a: Omit<Asset, 'id' | 'code' | 'history'>) {
      await wait()
      mutate((db) => {
        const n = db.assets.length + 1
        db.assets.unshift({ ...a, id: uid('as'), code: `AST-${String(n).padStart(4, '0')}`, history: [{ date: today(), text: 'Added to inventory' }] })
        log(db, `added ${a.name} to assets`, 'asset')
      })
    },
    async update(id: string, patch: Partial<Asset>) {
      await wait(250)
      mutate((db) => { const a = db.assets.find((x) => x.id === id); if (a) Object.assign(a, patch) })
    },
    async assign(id: string, empId: string | undefined, note?: string) {
      await wait()
      mutate((db) => {
        const a = db.assets.find((x) => x.id === id)
        if (!a) return
        const prev = a.assignedTo
        a.assignedTo = empId
        a.assignedOn = empId ? today() : undefined
        a.status = empId ? 'assigned' : 'available'
        a.history.push({ date: today(), text: empId ? `Assigned to ${nameOf(db, empId)}${note ? ` — ${note}` : ''}` : `Returned by ${prev ? nameOf(db, prev) : 'employee'}${note ? ` — ${note}` : ''}` })
        log(db, empId ? `assigned ${a.name} to ${nameOf(db, empId)}` : `collected ${a.name} back`, 'asset')
      })
    },
    async setStatus(id: string, status: Asset['status'], note: string) {
      await wait()
      mutate((db) => {
        const a = db.assets.find((x) => x.id === id)
        if (!a) return
        a.status = status
        if (status !== 'assigned') a.assignedTo = undefined
        a.history.push({ date: today(), text: note })
      })
    },
    async remove(id: string) {
      await wait(250)
      mutate((db) => { db.assets = db.assets.filter((a) => a.id !== id) })
    },
  },

  // ---------------- goals ----------------
  goals: {
    async create(g: Omit<Goal, 'id' | 'createdAt' | 'updates' | 'status'>) {
      await wait()
      mutate((db) => {
        db.goals.unshift({ ...g, id: uid('g'), createdAt: today(), status: 'on-track', updates: [] })
        log(db, `assigned “${g.title}” to ${nameOf(db, g.empId)}`, 'system')
      })
    },
    async checkIn(id: string, value: number, text: string) {
      await wait()
      mutate((db) => {
        const g = db.goals.find((x) => x.id === id)
        if (!g) return
        g.current = value
        g.updates.push({ date: today(), text, value })
        const lower = g.unit === 'days' || g.unit === 'ms'
        const p = lower ? Math.min(1, g.target / Math.max(value, 0.0001)) : Math.min(1, value / g.target)
        g.status = p >= 1 ? 'completed' : p > 0.66 ? 'on-track' : p > 0.4 ? 'at-risk' : 'behind'
      })
    },
    async update(id: string, patch: Partial<Goal>) {
      await wait(250)
      mutate((db) => { const g = db.goals.find((x) => x.id === id); if (g) Object.assign(g, patch) })
    },
    async remove(id: string) {
      await wait(250)
      mutate((db) => { db.goals = db.goals.filter((g) => g.id !== id) })
    },
  },

  // ---------------- payroll ----------------
  payroll: {
    async saveSalary(s: SalaryStructure) {
      await wait()
      mutate((db) => {
        const i = db.salaries.findIndex((x) => x.empId === s.empId)
        if (i >= 0) db.salaries[i] = s
        else db.salaries.push(s)
        log(db, `updated salary structure for ${nameOf(db, s.empId)}`, 'payroll')
      })
    },
    async syncFromOffers() {
      await wait(700)
      let n = 0
      mutate((db) => {
        db.offers.filter((o) => o.status === 'accepted' && o.empId).forEach((o) => {
          const s = db.salaries.find((x) => x.empId === o.empId)
          if (s && s.basic === 0) { Object.assign(s, { basic: o.salary.basic, hra: o.salary.hra, special: o.salary.special }); n++ }
        })
      })
      return n
    },
    async createRun(label: string, from: string, to: string, lines: PayrollLine[]) {
      await wait(900)
      let id = ''
      mutate((db) => {
        id = uid('pr')
        db.payrollRuns.unshift({ id, label, from, to, status: 'processed', createdAt: today(), lines })
        log(db, `processed payroll for ${label}`, 'payroll')
      })
      return id
    },
    async markPaid(id: string) {
      await wait()
      mutate((db) => {
        const r = db.payrollRuns.find((x) => x.id === id)
        if (!r) return
        r.status = 'paid'
        r.paidOn = today()
        log(db, `marked ${r.label} payroll as paid`, 'payroll')
      })
    },
    async removeRun(id: string) {
      await wait(250)
      mutate((db) => { db.payrollRuns = db.payrollRuns.filter((r) => r.id !== id) })
    },
    async saveStatutory(s: StatutorySettings) {
      await wait()
      mutate((db) => { db.statutory = s })
    },
  },

  // ---------------- announcements ----------------
  announcements: {
    async create(a: Omit<Announcement, 'id' | 'createdAt' | 'reads'>) {
      await wait()
      mutate((db) => {
        db.announcements.unshift({ ...a, id: uid('an'), createdAt: today(), reads: 0 })
        log(db, `${a.status === 'published' ? 'published' : 'scheduled'} “${a.title}”`, 'system')
      })
    },
    async update(id: string, patch: Partial<Announcement>) {
      await wait(250)
      mutate((db) => { const a = db.announcements.find((x) => x.id === id); if (a) Object.assign(a, patch) })
    },
    async remove(id: string) {
      await wait(250)
      mutate((db) => { db.announcements = db.announcements.filter((a) => a.id !== id) })
    },
    async publishBirthdays() {
      await wait()
      let n = 0
      mutate((db) => {
        const md = today().slice(5)
        db.employees.filter((e) => e.status === 'active' && e.dob.slice(5) === md).forEach((e) => {
          if (db.announcements.some((a) => a.kind === 'birthday' && a.empId === e.id && a.createdAt === today())) return
          db.announcements.unshift({ id: uid('an'), kind: 'birthday', title: `Happy Birthday, ${e.name}!`, body: `Today is ${e.name}'s birthday. Wish them a wonderful day!`, pinned: true, status: 'published', createdAt: today(), audience: 'All employees', reads: 0, empId: e.id })
          n++
        })
      })
      return n
    },
  },

  // ---------------- mail ----------------
  mail: {
    async send(m: Pick<Mail, 'to' | 'cc' | 'subject' | 'body' | 'attachments'>, scheduleAt?: string) {
      await wait(600)
      mutate((db) => {
        db.mails.unshift({
          ...m, id: uid('m'), folder: scheduleAt ? 'scheduled' : 'sent', from: { name: 'SurfSync HR', email: db.company.email },
          date: scheduleAt ?? new Date().toISOString(), read: true, starred: false,
        })
      })
    },
    async saveDraft(m: Pick<Mail, 'to' | 'cc' | 'subject' | 'body'>) {
      await wait(250)
      mutate((db) => {
        db.mails.unshift({ ...m, id: uid('m'), folder: 'drafts', from: { name: 'SurfSync HR', email: db.company.email }, date: new Date().toISOString(), read: true, starred: false })
      })
    },
    async patch(ids: string[], patch: Partial<Mail>) {
      mutate((db) => { db.mails.forEach((m) => { if (ids.includes(m.id)) Object.assign(m, patch) }) })
    },
    async remove(ids: string[]) {
      await wait(200)
      mutate((db) => {
        db.mails = db.mails.flatMap((m) => (!ids.includes(m.id) ? [m] : m.folder === 'trash' ? [] : [{ ...m, folder: 'trash' as const }]))
      })
    },
  },
  mailTemplates: collection('mailTemplates', 'mt'),

  // ---------------- settings ----------------
  settings: {
    async saveCompany(company: DB['company']) {
      await wait()
      mutate((db) => { db.company = company; if (!db.setupDone.includes('profile')) db.setupDone.push('profile') })
    },
    async saveBranding(branding: DB['branding']) {
      await wait()
      mutate((db) => { db.branding = branding; if (!db.setupDone.includes('branding')) db.setupDone.push('branding') })
    },
    async markDone(step: string) {
      mutate((db) => { if (!db.setupDone.includes(step)) db.setupDone.push(step) })
    },
  },
  branches: collection('branches', 'br'),
  departments: collection('departments', 'dep'),
  teams: collection('teams', 'team'),
  workLocations: collection('workLocations', 'wl'),
  shifts: collection('shifts', 'sh'),
  policies: collection('policies', 'po'),
  roles: collection('roles', 'role'),
  holidays: {
    ...collection('holidays', 'hol'),
    async toggle(date: string, name: string, type: Holiday['type']) {
      await wait(150)
      mutate((db) => {
        const existing = db.holidays.find((h) => h.date === date)
        if (existing) db.holidays = db.holidays.filter((h) => h.date !== date)
        else db.holidays.push({ id: uid('hol'), date, name, type })
      })
    },
    async loadNational(year: number) {
      await wait(600)
      const fixed: [string, string][] = [[`${year}-01-26`, 'Republic Day'], [`${year}-08-15`, 'Independence Day'], [`${year}-10-02`, 'Gandhi Jayanti'], [`${year}-12-25`, 'Christmas']]
      let added = 0
      mutate((db) => {
        fixed.forEach(([date, name]) => {
          if (!db.holidays.some((h) => h.date === date)) { db.holidays.push({ id: uid('hol'), date, name, type: 'National' }); added++ }
        })
      })
      return added
    },
  },

  // ---------------- notifications ----------------
  notifications: {
    markRead(id?: string) {
      mutate((db) => { db.notifications.forEach((n) => { if (!id || n.id === id) n.read = true }) })
    },
  },
}

/** Approximates "now" as HH:mm for regularisation defaults. */
export const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export { getDb }
