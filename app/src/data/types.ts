// Domain model for SurfSync HRMS. These shapes are the contract the backend
// should return — the mock layer in ./db.ts and ./api.ts implements them in-memory.

export type ID = string
export type ISODate = string // YYYY-MM-DD

export type EmployeeStatus = 'active' | 'onboarding' | 'notice' | 'inactive'
export type EmploymentType = 'Full Time' | 'Part Time' | 'Intern' | 'Contract'

export interface Employee {
  id: ID
  code: string
  name: string
  email: string
  personalEmail?: string
  phone: string
  gender: 'Male' | 'Female' | 'Other'
  dob: ISODate
  maritalStatus: 'Single' | 'Married'
  bloodGroup?: string
  department: string
  designation: string
  team: string
  branch: string
  workLocation: string
  shiftId: ID
  employmentType: EmploymentType
  joinDate: ISODate
  managerId?: ID
  status: EmployeeStatus
  avatarHue: number
  address: { line1: string; line2?: string; city: string; state: string; pincode: string; country: string }
  emergency: { name: string; relation: string; phone: string }
  bank: { holder: string; bankName: string; account: string; ifsc: string }
  documents: { pan: boolean; aadhaar: boolean; signature: boolean; certificates: boolean; photo: boolean }
  roleId?: ID
}

export type AttendanceStatus = 'present' | 'late' | 'half-day' | 'absent' | 'leave' | 'holiday' | 'weekend'

export interface ActivityPeriod { from: string; to: string; activeMins: number; idleMins: number }

export interface AttendanceRecord {
  id: ID
  empId: ID
  date: ISODate
  status: AttendanceStatus
  checkIn?: string // HH:mm
  checkOut?: string
  method?: 'Face scan' | 'GPS' | 'Web'
  location?: string
  activePct?: number
  periods?: ActivityPeriod[]
  trail?: [number, number][] // normalized 0..1 coordinates for the GPS trail sketch
  note?: string
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveType { id: ID; name: string; code: string; daysPerYear: number; paid: boolean; carryForward: boolean; active: boolean; color: string }

export interface LeaveRequest {
  id: ID
  empId: ID
  typeId: ID
  from: ISODate
  to: ISODate
  days: number
  halfDay?: boolean
  reason: string
  status: RequestStatus
  appliedOn: ISODate
  decidedOn?: ISODate
  adminNote?: string
}

export interface WorkReport {
  id: ID
  empId: ID
  date: ISODate
  hours: number
  title: string
  summary: string
  tasks: { text: string; done: boolean }[]
  blockers?: string
  status: RequestStatus
  reviewNote?: string
}

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export interface SalaryBreakup { basic: number; hra: number; special: number; employeePf: number; employerPf: number }

export interface OfferLetter {
  id: ID
  candidateName: string
  email: string
  phone?: string
  designation: string
  department: string
  joinDate: ISODate
  reportingTo: string
  reportingDesignation: string
  salary: SalaryBreakup
  terms: string[]
  status: OfferStatus
  createdAt: ISODate
  sentAt?: ISODate
  respondedAt?: ISODate
  empId?: ID
  source: 'generated' | 'uploaded'
}

export type AssetStatus = 'available' | 'assigned' | 'repair' | 'retired'
export type AssetCategory = 'Laptop' | 'Phone' | 'SIM Card' | 'ID Card' | 'Vehicle' | 'Accessories' | 'Other'

export interface Asset {
  id: ID
  code: string
  name: string
  category: AssetCategory
  serial: string
  specs: string
  purchaseDate: ISODate
  cost: number
  warrantyExpiry?: ISODate
  status: AssetStatus
  assignedTo?: ID
  assignedOn?: ISODate
  history: { date: ISODate; text: string }[]
}

export type GoalStatus = 'on-track' | 'at-risk' | 'behind' | 'completed'

export interface Goal {
  id: ID
  empId: ID
  title: string
  description: string
  metric: string
  target: number
  current: number
  unit: string
  deadline: ISODate
  createdAt: ISODate
  status: GoalStatus
  weight: number
  updates: { date: ISODate; text: string; value: number }[]
}

export interface SalaryStructure {
  empId: ID
  basic: number
  hra: number
  special: number
  otherDeductions: number
  tdsMonthly: number
  pfEnabled: boolean
  effectiveFrom: ISODate
}

export interface PayrollLine {
  empId: ID
  gross: number
  workingDays: number
  lwpDays: number
  lwpDeduction: number
  pf: number
  esi: number
  pt: number
  tds: number
  other: number
  net: number
}

export interface PayrollRun {
  id: ID
  label: string
  from: ISODate
  to: ISODate
  status: 'draft' | 'processed' | 'paid'
  createdAt: ISODate
  paidOn?: ISODate
  lines: PayrollLine[]
}

export interface StatutorySettings {
  pfEnabled: boolean
  pfEmployeePct: number
  pfEmployerPct: number
  pfWageCeiling: number
  pfUseCeiling: boolean
  esiEnabled: boolean
  esiEmployeePct: number
  esiEmployerPct: number
  esiGrossLimit: number
  ptEnabled: boolean
  ptState: string
  ptOverride?: number
  tdsEnabled: boolean
  showEmployerOnPayslip: boolean
  payDay: number
}

export type AnnouncementKind = 'notice' | 'event' | 'alert' | 'birthday'

export interface Announcement {
  id: ID
  kind: AnnouncementKind
  title: string
  body: string
  eventDate?: ISODate
  eventTime?: string
  venue?: string
  expiresAt?: ISODate
  pinned: boolean
  status: 'published' | 'scheduled' | 'draft'
  publishAt?: ISODate
  createdAt: ISODate
  audience: string // 'All employees' or department name
  reads: number
  empId?: ID
}

export type MailFolder = 'inbox' | 'sent' | 'scheduled' | 'drafts' | 'trash'

export interface Mail {
  id: ID
  folder: MailFolder
  from: { name: string; email: string }
  to: string[]
  cc?: string[]
  subject: string
  body: string
  date: string // ISO datetime
  read: boolean
  starred: boolean
  labels?: string[]
  attachments?: { name: string; size: string }[]
}

export interface MailTemplate { id: ID; name: string; subject: string; body: string; category: string }

export interface Branch { id: ID; name: string; code: string; city: string; state: string; type: 'Head Office' | 'Branch' | 'Remote'; active: boolean }
export interface Department { id: ID; name: string; code: string; description: string; headId?: ID; active: boolean }
export interface Team { id: ID; name: string; department: string; description: string; leadId?: ID; active: boolean }
export interface WorkLocation { id: ID; name: string; type: 'Office' | 'Remote' | 'Client site'; address: string; radius: number; active: boolean }
export interface Shift { id: ID; name: string; start: string; end: string; breakMins: number; graceMins: number; weeklyOff: string[]; active: boolean }
export interface Holiday { id: ID; date: ISODate; name: string; type: 'National' | 'Festival' | 'Regional' | 'Optional' }
export interface Policy { id: ID; title: string; body: string; requiresAcceptance: boolean; active: boolean; updatedAt: ISODate; acceptedBy: number }

export type Access = 'none' | 'view' | 'edit' | 'full'
export const MODULES = [
  'Dashboard', 'Employees', 'Onboarding', 'Assets', 'Attendance', 'Leave',
  'Goals', 'Work Reports', 'Payroll', 'Announcements', 'Mail', 'Settings',
] as const
export type Module = (typeof MODULES)[number]
export interface Role { id: ID; name: string; description: string; permissions: Record<Module, Access>; system?: boolean; members: number }

export interface CompanyProfile {
  name: string
  legalName: string
  email: string
  phone: string
  website: string
  industry: string
  size: string
  gstin: string
  pan: string
  address: { line1: string; line2: string; city: string; state: string; pincode: string; country: string }
  timezone: string
  currency: string
  fiscalYearStart: string
}

export interface Branding {
  tagline: string
  primary: string
  secondary: string
  loginStyle: 'gradient' | 'solid' | 'image'
}

export interface Notification {
  id: ID
  title: string
  body: string
  date: string
  read: boolean
  kind: 'leave' | 'report' | 'offer' | 'attendance' | 'payroll' | 'system' | 'asset'
  link?: string
}

export interface ActivityLog { id: ID; date: string; actor: string; text: string; kind: Notification['kind'] }

export interface DB {
  version: number
  employees: Employee[]
  attendance: AttendanceRecord[]
  leaveTypes: LeaveType[]
  leaves: LeaveRequest[]
  reports: WorkReport[]
  offers: OfferLetter[]
  assets: Asset[]
  goals: Goal[]
  salaries: SalaryStructure[]
  payrollRuns: PayrollRun[]
  statutory: StatutorySettings
  announcements: Announcement[]
  mails: Mail[]
  mailTemplates: MailTemplate[]
  branches: Branch[]
  departments: Department[]
  teams: Team[]
  workLocations: WorkLocation[]
  shifts: Shift[]
  holidays: Holiday[]
  policies: Policy[]
  roles: Role[]
  company: CompanyProfile
  branding: Branding
  notifications: Notification[]
  activity: ActivityLog[]
  setupDone: string[]
}
