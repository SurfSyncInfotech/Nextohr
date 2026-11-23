// Demo data generator. Everything is relative to "today" so the product always
// looks live, and seeded so it is identical across reloads until reset.
import type {
  ActivityPeriod, Announcement, Asset, AttendanceRecord, DB, Employee, Goal, LeaveRequest, LeaveType,
  Mail, OfferLetter, PayrollRun, Role, SalaryStructure, WorkReport, Access, Module, Holiday,
} from './types'
import { MODULES } from './types'
import { addDays, eachDay, endOfMonth, isSunday, monthName, pad, parseISO, rng, startOfMonth, toISO, today, toMins } from '@/lib/utils'
import { buildPayrollLines } from '@/lib/payroll'

export const DB_VERSION = 5

type Seed = [name: string, dept: string, designation: string, team: string, type: Employee['employmentType'], gender: Employee['gender'], gross: number, joinOffsetDays: number, status?: Employee['status']]

const PEOPLE: Seed[] = [
  ['Kabir Malhotra', 'Management', 'Engineering Manager', 'Development', 'Full Time', 'Male', 145000, -980],
  ['Meera Nair', 'Human Resources', 'HR Manager', 'HR', 'Full Time', 'Female', 98000, -910],
  ['Arjun Reddy', 'Sales', 'Sales Manager', 'Sales', 'Full Time', 'Male', 92000, -760],
  ['Neha Kapoor', 'Management', 'Operations Lead', 'Operations', 'Full Time', 'Female', 88000, -700],
  ['Deepak Saini', 'Development', 'N8N Developer', 'Development', 'Full Time', 'Male', 25000, -230],
  ['Sehar Afroz', 'Digital Marketing', 'Social Media Manager', 'Digital Marketing', 'Full Time', 'Female', 30000, -205],
  ['Pranshu Mishra', 'Development', 'Android Developer', 'Development', 'Full Time', 'Male', 25000, -320],
  ['Rishu Kumar', 'Development', 'Full Stack Developer Intern', 'Development', 'Intern', 'Male', 18000, -120],
  ['Harsh Vishnaliya', 'Sales', 'Sales Executive', 'Sales', 'Full Time', 'Male', 15000, -260],
  ['Vanshikha', 'Human Resources', 'HR Executive', 'HR', 'Full Time', 'Female', 20000, -300],
  ['Rasha', 'Development', 'Full Stack Developer', 'Development', 'Full Time', 'Female', 25000, -410],
  ['Golla Diwakar Yadav', 'Design', 'UI/UX Designer Intern', 'Design', 'Intern', 'Male', 18000, -75],
  ['Richa Sharma', 'Business Development', 'Business Development Executive', 'Sales', 'Full Time', 'Female', 51800, -350],
  ['Nitesh Pawar', 'Development', 'Full Stack Developer', 'Development', 'Full Time', 'Male', 27200, -440],
  ['Ananya Iyer', 'Design', 'Product Designer', 'Design', 'Full Time', 'Female', 62000, -520],
  ['Priya Verma', 'Digital Marketing', 'Content Strategist', 'Digital Marketing', 'Full Time', 'Female', 38000, -280],
  ['Rohan Gupta', 'Development', 'Backend Developer', 'Development', 'Full Time', 'Male', 58000, -600],
  ['Sneha Kulkarni', 'Development', 'QA Engineer', 'Development', 'Full Time', 'Female', 42000, -380],
  ['Aditya Singh', 'Business Development', 'BD Manager', 'Sales', 'Full Time', 'Male', 72000, -650],
  ['Ishita Bansal', 'Digital Marketing', 'Performance Marketer', 'Digital Marketing', 'Full Time', 'Female', 45000, -180],
  ['Vikram Chauhan', 'Development', 'DevOps Engineer', 'Development', 'Full Time', 'Male', 68000, -480],
  ['Mohit Yadav', 'Sales', 'Sales Executive', 'Sales', 'Full Time', 'Male', 16000, -400, 'notice'],
  ['Siddharth Rao', 'Development', 'Frontend Developer', 'Development', 'Full Time', 'Male', 48000, -720, 'inactive'],
  ['Tanvi Joshi', 'Design', 'Graphic Designer', 'Design', 'Full Time', 'Female', 32000, 9, 'onboarding'],
]

const CITIES = [
  ['Noida', 'Uttar Pradesh', '201301'], ['Ghaziabad', 'Uttar Pradesh', '201001'], ['New Delhi', 'Delhi', '110092'],
  ['Gurugram', 'Haryana', '122001'], ['Faridabad', 'Haryana', '121001'],
] as const
const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank']

const slug = (n: string) => n.toLowerCase().split(' ')[0]!

export function seed(): DB {
  const r = rng(20261025)
  const T = today()

  // ---------- organisation ----------
  const departments = [
    ['Development', 'DEV', 'Builds and ships the product across web, mobile and automation.'],
    ['Design', 'DES', 'Product, UX and brand design.'],
    ['Sales', 'SAL', 'Owns revenue: prospecting, demos, negotiation and closing.'],
    ['Business Development', 'BDE', 'Finds new business opportunities and builds client relationships.'],
    ['Digital Marketing', 'DM', 'Brand, social media, SEO, paid campaigns and content.'],
    ['Human Resources', 'HR', 'Recruitment, onboarding, payroll coordination and people policies.'],
    ['Management', 'MGT', 'Leadership and operations.'],
  ].map(([name, code, description], i) => ({ id: `dep_${i + 1}`, name: name!, code: code!, description: description!, active: true, headId: undefined as string | undefined }))

  const teams = [
    ['Development', 'Development', 'Web, mobile and automation engineering.'],
    ['Design', 'Design', 'UX research, product design and visual identity.'],
    ['HR', 'Human Resources', 'Onboarding, attendance, payroll coordination and employee relations.'],
    ['Digital Marketing', 'Digital Marketing', 'Campaigns across social media, SEO, paid and email.'],
    ['Sales', 'Sales', 'Leads, demos, negotiation and revenue targets.'],
    ['Operations', 'Management', 'Finance, admin and vendor management.'],
  ].map(([name, department, description], i) => ({ id: `team_${i + 1}`, name: name!, department: department!, description: description!, active: true, leadId: undefined as string | undefined }))

  const branches = [
    { id: 'br_1', name: 'Noida HQ', code: 'NOI-01', city: 'Noida', state: 'Uttar Pradesh', type: 'Head Office' as const, active: true },
    { id: 'br_2', name: 'Bengaluru', code: 'BLR-01', city: 'Bengaluru', state: 'Karnataka', type: 'Branch' as const, active: true },
    { id: 'br_3', name: 'Remote', code: 'REM', city: '—', state: '—', type: 'Remote' as const, active: true },
  ]
  const workLocations = [
    { id: 'wl_1', name: 'Noida Office', type: 'Office' as const, address: 'Sector 62, Noida, Uttar Pradesh 201309', radius: 150, active: true },
    { id: 'wl_2', name: 'Bengaluru Office', type: 'Office' as const, address: 'HSR Layout, Bengaluru, Karnataka 560102', radius: 150, active: true },
    { id: 'wl_3', name: 'Remote', type: 'Remote' as const, address: 'Anywhere', radius: 0, active: true },
    { id: 'wl_4', name: 'Client — Mamura', type: 'Client site' as const, address: 'Mamura, Noida, Uttar Pradesh 201316', radius: 200, active: true },
  ]
  const shifts = [
    { id: 'sh_1', name: 'General', start: '09:00', end: '18:00', breakMins: 60, graceMins: 15, weeklyOff: ['Sun'], active: true },
    { id: 'sh_2', name: 'Late', start: '11:00', end: '20:00', breakMins: 60, graceMins: 15, weeklyOff: ['Sun'], active: true },
  ]

  // ---------- employees ----------
  const employees: Employee[] = PEOPLE.map((p, i) => {
    const [name, department, designation, team, type, gender, , joinOffset, status] = p
    const city = r.pick(CITIES)
    const y = r.int(1990, 2003)
    const isRemote = i % 7 === 6
    const dobMonth = i === 6 ? parseISO(T).getMonth() : r.int(0, 11)
    const dobDay = i === 6 ? Math.min(28, parseISO(addDays(T, 3)).getDate()) : r.int(1, 28)
    const complete = r.chance(0.75)
    return {
      id: `emp_${i + 1}`,
      code: `EMP-${pad(i + 1).padStart(4, '0')}`,
      name,
      email: `${slug(name)}@surfsyncinfotech.in`,
      personalEmail: `${slug(name)}.${y}@gmail.com`,
      phone: `+91 9${r.int(100000000, 999999999)}`,
      gender,
      dob: `${y}-${pad(dobMonth + 1)}-${pad(dobDay)}`,
      maritalStatus: r.chance(0.3) ? 'Married' : 'Single',
      bloodGroup: r.pick(['A+', 'B+', 'O+', 'AB+', 'B-', 'O-']),
      department,
      designation,
      team,
      branch: isRemote ? 'Remote' : 'Noida HQ',
      workLocation: isRemote ? 'Remote' : i % 5 === 3 ? 'Client — Mamura' : 'Noida Office',
      shiftId: i % 9 === 8 ? 'sh_2' : 'sh_1',
      employmentType: type,
      joinDate: addDays(T, joinOffset),
      managerId: undefined,
      status: status ?? 'active',
      avatarHue: (i * 47) % 360,
      address: { line1: `${r.int(12, 480)}, ${r.pick(['Sector 18', 'Sector 62', 'Indirapuram', 'Vaishali', 'Laxmi Nagar', 'DLF Phase 3'])}`, city: city[0], state: city[1], pincode: city[2], country: 'India' },
      emergency: { name: `${r.pick(['Sunita', 'Rajesh', 'Anil', 'Kavita', 'Ramesh'])} ${name.split(' ').slice(-1)[0]}`, relation: r.pick(['Father', 'Mother', 'Spouse', 'Sibling']), phone: `+91 9${r.int(100000000, 999999999)}` },
      bank: { holder: name, bankName: r.pick(BANKS), account: `${r.int(1000, 9999)}${r.int(10000000, 99999999)}`, ifsc: `${r.pick(['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])}000${r.int(1000, 9999)}` },
      documents: { pan: complete || r.chance(0.6), aadhaar: true, signature: complete, certificates: complete || r.chance(0.4), photo: true },
      roleId: department === 'Human Resources' ? 'role_hr' : department === 'Management' ? 'role_manager' : 'role_employee',
    }
  })
  const managers: Record<string, string> = {
    Development: 'emp_1', Design: 'emp_1', 'Human Resources': 'emp_2', Sales: 'emp_3', 'Business Development': 'emp_19', 'Digital Marketing': 'emp_4', Management: '',
  }
  employees.forEach((e) => { const m = managers[e.department]; if (m && m !== e.id) e.managerId = m })
  departments.forEach((d) => { d.headId = managers[d.name] || 'emp_4' })
  teams.forEach((t) => { t.leadId = managers[t.department] || 'emp_4' })

  // ---------- holidays (2026) ----------
  const holidays: Holiday[] = ([
    ['2026-01-01', "New Year's Day", 'Optional'], ['2026-01-26', 'Republic Day', 'National'], ['2026-03-04', 'Holi', 'Festival'],
    ['2026-03-20', 'Eid ul-Fitr', 'Festival'], ['2026-04-03', 'Good Friday', 'Optional'], ['2026-08-15', 'Independence Day', 'National'],
    ['2026-08-28', 'Raksha Bandhan', 'Optional'], ['2026-09-04', 'Janmashtami', 'Festival'], ['2026-09-14', 'Ganesh Chaturthi', 'Regional'],
    ['2026-10-02', 'Gandhi Jayanti', 'National'], ['2026-10-20', 'Dussehra', 'Festival'], ['2026-11-08', 'Diwali', 'Festival'],
    ['2026-11-09', 'Govardhan Puja', 'Optional'], ['2026-11-24', 'Guru Nanak Jayanti', 'Festival'], ['2026-12-25', 'Christmas', 'Festival'],
    ['2027-01-01', "New Year's Day", 'Optional'], ['2027-01-26', 'Republic Day', 'National'],
  ] as const).map(([date, name, type], i) => ({ id: `hol_${i + 1}`, date, name, type }))
  const holidaySet = new Set(holidays.filter((h) => h.type !== 'Optional').map((h) => h.date))

  // ---------- leave types & requests ----------
  const leaveTypes: LeaveType[] = [
    { id: 'lt_cl', name: 'Casual Leave', code: 'CL', daysPerYear: 12, paid: true, carryForward: false, active: true, color: '#2A9CB8' },
    { id: 'lt_sl', name: 'Sick Leave', code: 'SL', daysPerYear: 12, paid: true, carryForward: false, active: true, color: '#F68713' },
    { id: 'lt_el', name: 'Earned Leave', code: 'EL', daysPerYear: 15, paid: true, carryForward: true, active: true, color: '#16A34A' },
    { id: 'lt_co', name: 'Comp Off', code: 'CO', daysPerYear: 0, paid: true, carryForward: false, active: true, color: '#7C3AED' },
    { id: 'lt_lwp', name: 'Leave Without Pay', code: 'LWP', daysPerYear: 0, paid: false, carryForward: false, active: true, color: '#6B7280' },
  ]
  const workingSpan = (from: string, n: number) => {
    const out: string[] = []
    for (let d = from; out.length < n; d = addDays(d, 1)) if (!isSunday(d) && !holidaySet.has(d)) out.push(d)
    return out
  }
  const REASONS: Record<string, string[]> = {
    lt_sl: [
      "I'm not feeling well today — high fever since morning. I came to the office hoping it would settle but it hasn't. My pending tasks are handed over and I'll stay reachable on phone.",
      'Suffering from diarrhoea and vomiting since last night, the doctor has advised two days of rest.',
      'Feeling unwell due to stress and anxiety; need a day to rest and recover.',
      'Down with a viral infection. Will share the medical certificate on return.',
    ],
    lt_cl: [
      'I would like to request leave to attend my mid-term university examinations. Work is planned around it and Rasha will cover urgent items.',
      'Family function in my hometown — travelling Thursday night.',
      'Need to visit the passport office and bank for some pending personal work.',
      'Ganpati festival celebration and family religious commitments.',
    ],
    lt_el: ['Planned vacation with family to Himachal. All sprint tasks will be closed before I leave.', 'Sister’s wedding — need the full week for preparations and travel.'],
    lt_lwp: ['Extended personal leave — my paid balance is exhausted.'],
    lt_co: ['Comp off for working on Saturday release.'],
  }
  const leaves: LeaveRequest[] = []
  const addLeave = (empIdx: number, typeId: string, startOffset: number, n: number, status: LeaveRequest['status'], appliedBefore = 2, note?: string) => {
    const start = workingSpan(addDays(T, startOffset), 1)[0]!
    const span = workingSpan(start, n)
    leaves.push({
      id: `lv_${leaves.length + 1}`, empId: `emp_${empIdx}`, typeId, from: span[0]!, to: span[span.length - 1]!, days: n,
      reason: r.pick(REASONS[typeId]!), status, appliedOn: addDays(span[0]!, -appliedBefore),
      decidedOn: status === 'pending' ? undefined : addDays(span[0]!, -1), adminNote: note,
    })
  }
  addLeave(13, 'lt_sl', -9, 1, 'approved', 0, 'Get well soon.')
  addLeave(12, 'lt_cl', -12, 3, 'approved', 6)
  addLeave(9, 'lt_sl', -19, 1, 'approved', 0)
  addLeave(11, 'lt_sl', -20, 1, 'cancelled', 0)
  addLeave(16, 'lt_el', -33, 4, 'approved', 14)
  addLeave(18, 'lt_cl', -26, 1, 'rejected', 1, 'Quarter-end demo week — please reschedule.')
  addLeave(7, 'lt_lwp', -15, 2, 'approved', 3)
  addLeave(22, 'lt_cl', -6, 1, 'approved', 2)
  addLeave(5, 'lt_sl', 0, 1, 'approved', 0, 'Approved — rest well.')
  addLeave(20, 'lt_cl', 0, 1, 'approved', 4)
  // pending queue
  addLeave(11, 'lt_sl', 1, 1, 'pending', 1)
  addLeave(14, 'lt_cl', 4, 1, 'pending', 3)
  addLeave(14, 'lt_sl', 9, 1, 'pending', 1)
  addLeave(14, 'lt_cl', 12, 5, 'pending', 8)
  addLeave(17, 'lt_el', 18, 5, 'pending', 10)
  addLeave(6, 'lt_cl', 6, 2, 'pending', 2)
  addLeave(15, 'lt_co', 3, 1, 'pending', 1)

  const onLeave = (empId: string, d: string) =>
    leaves.some((l) => l.empId === empId && l.status === 'approved' && d >= l.from && d <= l.to)

  // ---------- attendance ----------
  const attendance: AttendanceRecord[] = []
  const LOCS = ['Sector 62, Noida, Uttar Pradesh', 'Mamura, Noida, Uttar Pradesh 201316', 'Indirapuram, Ghaziabad, UP', 'Remote — Home']
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const start = addDays(T, -75)
  for (const e of employees) {
    if (e.status === 'onboarding') continue
    const shift = shifts.find((s) => s.id === e.shiftId)!
    const reliability = 0.86 + r.next() * 0.1
    for (const d of eachDay(start, T)) {
      if (d < e.joinDate) continue
      if (e.status === 'inactive' && d > addDays(T, -30)) continue
      const id = `att_${e.id}_${d}`
      if (isSunday(d)) { attendance.push({ id, empId: e.id, date: d, status: 'weekend' }); continue }
      if (holidaySet.has(d)) { attendance.push({ id, empId: e.id, date: d, status: 'holiday' }); continue }
      if (onLeave(e.id, d)) { attendance.push({ id, empId: e.id, date: d, status: 'leave' }); continue }
      const isToday = d === T
      const roll = r.next()
      if (roll > reliability + 0.04) { attendance.push({ id, empId: e.id, date: d, status: 'absent' }); continue }
      const late = roll > reliability - 0.08
      const inMins = toMins(shift.start) + (late ? r.int(17, 70) : r.int(-25, 12))
      if (isToday && inMins > nowMins) continue // hasn't checked in yet
      const halfDay = !late && r.chance(0.025)
      const workMins = halfDay ? r.int(230, 280) : r.int(500, 590)
      const outMins = inMins + workMins
      const checkedOut = !isToday || outMins < nowMins
      const endMins = checkedOut ? outMins : nowMins
      const periods: ActivityPeriod[] = []
      for (let p = inMins; p < endMins; p += 108) {
        const len = Math.min(108, endMins - p)
        const idle = Math.round(len * (0.02 + r.next() * 0.12))
        periods.push({ from: `${pad(Math.floor(p / 60))}:${pad(p % 60)}`, to: `${pad(Math.floor((p + len) / 60))}:${pad((p + len) % 60)}`, activeMins: len - idle, idleMins: idle })
      }
      const active = periods.reduce((a, p) => a + p.activeMins, 0)
      const total = periods.reduce((a, p) => a + p.activeMins + p.idleMins, 0)
      const cx = 0.35 + r.next() * 0.3, cy = 0.35 + r.next() * 0.3
      attendance.push({
        id, empId: e.id, date: d,
        status: halfDay ? 'half-day' : late ? 'late' : 'present',
        checkIn: `${pad(Math.floor(inMins / 60))}:${pad(inMins % 60)}`,
        checkOut: checkedOut ? `${pad(Math.floor(outMins / 60))}:${pad(outMins % 60)}` : undefined,
        method: e.branch === 'Remote' ? 'Web' : r.chance(0.8) ? 'Face scan' : 'GPS',
        location: e.branch === 'Remote' ? LOCS[3] : e.workLocation === 'Client — Mamura' ? LOCS[1] : r.chance(0.85) ? LOCS[0] : LOCS[2],
        activePct: total ? Math.round((active / total) * 100) : 0,
        periods,
        trail: Array.from({ length: 5 }, (_, k) => [cx + (k - 2) * 0.04 + (r.next() - 0.5) * 0.03, cy + (k - 2) * 0.03 + (r.next() - 0.5) * 0.03]),
      })
    }
  }

  // ---------- daily work reports ----------
  const WORK: Record<string, [string, string, string[]][]> = {
    Development: [
      ['AI avatar & video generation', 'Fixed the upload pipeline for the mobile app, wired the admin panel to the new render queue and wrote retry logic for failed jobs.', ['Fix upload pipeline', 'Admin panel queue view', 'Retry failed jobs']],
      ['Automation workflows', 'Completed the core of two automation workflows — LinkedIn lead collection and CRM sync. Testing edge cases with duplicate leads.', ['LinkedIn lead workflow', 'CRM sync workflow', 'Duplicate lead handling']],
      ['GoWithTheFlow client changes', 'Implemented the client-requested UI changes for the debate notes section and fixed pagination on the history page.', ['Debate notes UI', 'History pagination']],
      ['Shopsphere build', 'Designed the frontend structure, set up the backend API and connected the database for product catalogue.', ['Frontend structure', 'Catalogue API', 'DB connection']],
      ['HRMS API hardening', 'Added rate limits to auth endpoints, moved secrets to vault and patched two N+1 queries on the attendance report.', ['Auth rate limits', 'Secrets to vault', 'Fix N+1 queries']],
    ],
    Design: [
      ['HRMS explainer video', 'Completed the HRMS product explainer storyboard and made the Pharmatrack case study visuals.', ['Explainer storyboard', 'Pharmatrack case study']],
      ['Design system audit', 'Audited buttons, inputs and tables against the new tokens; logged 14 inconsistencies.', ['Audit components', 'Log inconsistencies']],
    ],
    Sales: [
      ['Outbound calling', 'Made 56 calls; 4 prospects showed strong interest. Sent quotations to 2 clients and booked 1 demo.', ['56 calls', '2 quotations', '1 demo booked']],
      ['Pipeline review', 'Updated the CRM pipeline, followed up with 9 warm leads and closed one renewal.', ['CRM hygiene', 'Follow-ups', 'Renewal closed']],
    ],
    'Business Development': [
      ['LinkedIn outreach', 'Connection requests sent: 30. Connections accepted: 14. Pitched 6 founders on custom software builds.', ['30 requests', '14 accepted', '6 pitches']],
      ['Partner research', 'Shortlisted 8 agencies for white-label partnerships and drafted the outreach email.', ['Shortlist agencies', 'Draft outreach']],
    ],
    'Digital Marketing': [
      ['Social calendar', 'Conducted market research and competitor analysis; planned next week’s 9-post calendar.', ['Competitor analysis', 'Post calendar']],
      ['Paid campaign', 'Launched the Diwali lead-gen campaign; CTR 2.8% on day one. Paused 2 underperforming ad sets.', ['Launch campaign', 'Optimise ad sets']],
    ],
    'Human Resources': [
      ['Candidate sourcing', 'Sourced 18 candidates on LinkedIn for the Android role; screened 7 and scheduled 3 interviews.', ['Source candidates', 'Screen', 'Schedule interviews']],
      ['Onboarding prep', 'Prepared the onboarding kit for Tanvi, raised the laptop request and set up her accounts.', ['Onboarding kit', 'Laptop request', 'Account setup']],
    ],
    Management: [
      ['Weekly planning', 'Reviewed sprint progress with leads, approved vendor invoices and finalised the Q4 hiring plan.', ['Sprint review', 'Vendor invoices', 'Q4 hiring plan']],
    ],
  }
  const reports: WorkReport[] = []
  const reportDays = eachDay(addDays(T, -14), T).filter((d) => !isSunday(d) && !holidaySet.has(d))
  for (const d of reportDays) {
    for (const e of employees) {
      if (e.status !== 'active' && e.status !== 'notice') continue
      const rec = attendance.find((a) => a.empId === e.id && a.date === d)
      if (!rec || !rec.checkIn || r.chance(0.12)) continue
      const [title, summary, tasks] = r.pick(WORK[e.department]!)
      const ageDays = reportDays.length - reportDays.indexOf(d)
      const status: WorkReport['status'] = ageDays > 2 ? (r.chance(0.92) ? 'approved' : 'rejected') : 'pending'
      reports.push({
        id: `wr_${reports.length + 1}`, empId: e.id, date: d,
        hours: Math.round((r.int(60, 92) / 10) * 2) / 2,
        title, summary, tasks: tasks.map((t) => ({ text: t, done: r.chance(0.8) })),
        blockers: r.chance(0.15) ? 'Waiting on client feedback for the final copy.' : undefined,
        status, reviewNote: status === 'rejected' ? 'Please add measurable outcomes for each task.' : undefined,
      })
    }
  }
  reports.sort((a, b) => b.date.localeCompare(a.date))

  // ---------- salary ----------
  const salaries: SalaryStructure[] = employees.map((e, i) => {
    const gross = PEOPLE[i]![6]
    const basic = Math.round(gross * (gross > 40000 ? 0.5 : 0.55) / 100) * 100
    const hra = Math.round(basic * 0.4 / 100) * 100
    return {
      empId: e.id, basic, hra, special: gross - basic - hra,
      otherDeductions: 0, tdsMonthly: gross > 80000 ? Math.round(gross * 0.06) : gross > 60000 ? Math.round(gross * 0.02) : 0,
      pfEnabled: gross > 26000, effectiveFrom: e.joinDate,
    }
  })

  // ---------- offers ----------
  const TERMS = [
    "Probation: You will be on probation for a period of three (3) months from your date of joining, which may be extended at the company's discretion. On successful completion, your employment will be confirmed in writing.",
    'Working Hours: Standard working days are Monday to Saturday, with office hours from 9:00 AM to 6:00 PM. You may occasionally be required to work additional hours to meet project deadlines.',
    'Notice Period: Either party may terminate this employment by serving one (1) month written notice, or salary in lieu thereof, subject to management approval.',
    'Confidentiality & IP: You shall maintain strict confidentiality of all company and client information, source code and business data, during and after your employment. All work created by you during employment shall be the exclusive property of SurfSync Infotech.',
    'Exclusivity: You shall not engage in any other employment, freelance work or business that conflicts with the interests of the company without prior written approval.',
    'Documents: This offer is contingent upon satisfactory verification of your documents. Please submit at joining: educational certificates, government photo ID (Aadhaar/PAN), relieving letter from previous employer (if any) and bank details.',
    'Validity: Kindly confirm your acceptance by signing the acceptance section and returning a copy of this letter within seven (7) days, failing which this offer may stand withdrawn.',
  ]
  const offerFor = (empIdx: number, status: OfferLetter['status'], src: OfferLetter['source'] = 'generated'): OfferLetter => {
    const e = employees[empIdx - 1]!, s = salaries[empIdx - 1]!
    const pf = s.pfEnabled ? Math.round(Math.min(s.basic, 15000) * 0.12) : 0
    return {
      id: `of_${empIdx}`, candidateName: e.name, email: e.email, phone: e.phone, designation: e.designation, department: e.department,
      joinDate: e.joinDate, reportingTo: employees.find((m) => m.id === e.managerId)?.name ?? 'Neha Kapoor',
      reportingDesignation: employees.find((m) => m.id === e.managerId)?.designation ?? 'Operations Lead',
      salary: { basic: s.basic, hra: s.hra, special: s.special, employeePf: pf, employerPf: pf },
      terms: TERMS, status, createdAt: addDays(e.joinDate, -14), sentAt: status === 'draft' ? undefined : addDays(e.joinDate, -13),
      respondedAt: status === 'accepted' || status === 'declined' ? addDays(e.joinDate, -10) : undefined,
      empId: status === 'accepted' ? e.id : undefined, source: src,
    }
  }
  const offers: OfferLetter[] = [
    offerFor(5, 'accepted'), offerFor(6, 'accepted'), offerFor(7, 'accepted', 'uploaded'), offerFor(8, 'accepted'),
    offerFor(9, 'accepted'), offerFor(11, 'accepted'), offerFor(12, 'accepted'), offerFor(13, 'accepted'), offerFor(14, 'accepted'),
    offerFor(20, 'accepted'), offerFor(24, 'accepted'),
    {
      id: 'of_c1', candidateName: 'Karan Mehta', email: 'karan.mehta@gmail.com', phone: '+91 9810012345', designation: 'Android Developer', department: 'Development',
      joinDate: addDays(T, 16), reportingTo: 'Kabir Malhotra', reportingDesignation: 'Engineering Manager',
      salary: { basic: 16500, hra: 6600, special: 6900, employeePf: 1800, employerPf: 1800 }, terms: TERMS, status: 'sent',
      createdAt: addDays(T, -3), sentAt: addDays(T, -3), source: 'generated',
    },
    {
      id: 'of_c2', candidateName: 'Aisha Khan', email: 'aisha.khan@outlook.com', designation: 'SEO Specialist', department: 'Digital Marketing',
      joinDate: addDays(T, 23), reportingTo: 'Neha Kapoor', reportingDesignation: 'Operations Lead',
      salary: { basic: 15000, hra: 6000, special: 7000, employeePf: 1800, employerPf: 1800 }, terms: TERMS, status: 'draft',
      createdAt: addDays(T, -1), source: 'generated',
    },
    {
      id: 'of_c3', candidateName: 'Rahul Bhatt', email: 'rahul.bhatt@gmail.com', designation: 'Sales Executive', department: 'Sales',
      joinDate: addDays(T, -2), reportingTo: 'Arjun Reddy', reportingDesignation: 'Sales Manager',
      salary: { basic: 9000, hra: 4500, special: 3333, employeePf: 1080, employerPf: 1080 }, terms: TERMS, status: 'declined',
      createdAt: addDays(T, -20), sentAt: addDays(T, -19), respondedAt: addDays(T, -12), source: 'generated',
    },
  ]

  // ---------- assets ----------
  const assetDefs: [string, Asset['category'], string, number][] = [
    ['MacBook Air M2', 'Laptop', '8GB / 256GB, Midnight', 99900], ['MacBook Pro 14"', 'Laptop', 'M3 Pro, 18GB / 512GB', 199900],
    ['Dell Latitude 5440', 'Laptop', 'i5-1335U, 16GB / 512GB', 72000], ['Lenovo ThinkPad E14', 'Laptop', 'Ryzen 5, 16GB / 512GB', 61000],
    ['HP ProBook 440', 'Laptop', 'i5-1235U, 8GB / 512GB', 54000], ['iPhone 13', 'Phone', '128GB — test device', 52900],
    ['Samsung Galaxy A54', 'Phone', '8GB / 128GB — Android QA', 34999], ['Jio SIM — Sales 1', 'SIM Card', 'Postpaid ₹399 plan', 0],
    ['Airtel SIM — Sales 2', 'SIM Card', 'Postpaid ₹449 plan', 0], ['Employee ID card', 'ID Card', 'RFID access — Noida HQ', 250],
    ['Honda Activa 6G', 'Vehicle', 'Field sales — UP16 AB 1234', 78000], ['Dell 24" Monitor', 'Accessories', 'P2422H', 14500],
    ['Logitech MX Keys', 'Accessories', 'Wireless keyboard', 9995], ['Jabra Evolve2 30', 'Accessories', 'USB headset', 6500],
    ['Canon EOS 200D', 'Other', 'Content shoots', 61000], ['Dell 24" Monitor', 'Accessories', 'P2422H', 14500],
    ['MacBook Air M1', 'Laptop', '8GB / 256GB, Space Grey', 79900], ['Lenovo IdeaPad Slim 3', 'Laptop', 'i5, 16GB / 512GB', 52000],
  ]
  const assignees = ['emp_5', 'emp_1', 'emp_7', 'emp_11', 'emp_14', 'emp_7', 'emp_18', 'emp_9', 'emp_22', 'emp_12', 'emp_9', 'emp_17', 'emp_15', undefined, 'emp_6', undefined, 'emp_16', undefined]
  const assets: Asset[] = assetDefs.map(([name, category, specs, cost], i) => {
    const assignedTo = i === 4 || i === 13 ? undefined : assignees[i]
    const status: Asset['status'] = i === 4 ? 'repair' : i === 13 ? 'available' : assignedTo ? 'assigned' : 'available'
    const pd = addDays(T, -r.int(60, 700))
    return {
      id: `as_${i + 1}`, code: `AST-${pad(i + 1).padStart(4, '0')}`, name, category, specs, cost,
      serial: category === 'SIM Card' ? `89910${r.int(10000000, 99999999)}` : `${category.slice(0, 2).toUpperCase()}${r.int(100000, 999999)}${String.fromCharCode(65 + (i % 26))}`,
      purchaseDate: pd, warrantyExpiry: cost > 20000 ? addDays(pd, 365 * (category === 'Laptop' ? 3 : 1)) : undefined,
      status, assignedTo, assignedOn: assignedTo ? addDays(pd, r.int(2, 20)) : undefined,
      history: [
        { date: pd, text: 'Purchased and added to inventory' },
        ...(assignedTo ? [{ date: addDays(pd, 5), text: `Assigned to ${employees.find((e) => e.id === assignedTo)!.name}` }] : []),
        ...(status === 'repair' ? [{ date: addDays(T, -4), text: 'Sent for repair — battery swelling' }] : []),
      ],
    }
  })

  // ---------- goals ----------
  const goalDefs: [number, string, string, number, number, string, number][] = [
    [5, 'Ship 6 automation workflows', 'Workflows live in production with monitoring.', 6, 4, 'workflows', 20],
    [7, 'Release Android app v2.0 to Play Store', 'Feature-complete, QA signed off and published.', 100, 70, '%', 25],
    [8, 'Close 40 backlog tickets', 'Clear the tech-debt backlog with peer review.', 40, 31, 'tickets', 30],
    [9, 'Generate ₹12L in new sales', 'New business revenue for the quarter.', 1200000, 540000, '₹', 30],
    [9, 'Book 25 product demos', 'Qualified demos with decision makers.', 25, 9, 'demos', 15],
    [10, 'Reduce time-to-hire to 21 days', 'Average from requisition to accepted offer.', 21, 26, 'days', 20],
    [11, 'Migrate billing service to Node 22', 'Zero-downtime migration with rollback plan.', 100, 100, '%', 20],
    [12, 'Redesign onboarding flow', 'Research, wireframes and hi-fi prototype.', 100, 45, '%', 25],
    [13, 'Sign 6 partner agencies', 'White-label partnerships signed.', 6, 2, 'partners', 30],
    [14, 'Cut API p95 latency to 300ms', 'Measured on the attendance and payroll endpoints.', 300, 420, 'ms', 25],
    [6, 'Grow Instagram to 10K followers', 'Organic growth through the content calendar.', 10000, 7400, 'followers', 25],
    [16, 'Publish 24 SEO articles', 'Long-form articles ranking for target keywords.', 24, 19, 'articles', 20],
    [17, 'Automate 80% of regression tests', 'Covering web + Android critical paths.', 80, 52, '%', 30],
    [20, 'Lower CAC by 15%', 'Paid acquisition efficiency across Meta and Google.', 15, 11, '%', 25],
    [21, '99.9% uptime for production', 'Measured monthly across core services.', 99.9, 99.95, '%', 30],
  ]
  const goals: Goal[] = goalDefs.map(([idx, title, description, target, current, unit, weight], i) => {
    const lowerIsBetter = unit === 'days' || unit === 'ms'
    const progress = lowerIsBetter ? Math.min(1, target / current) : Math.min(1, current / target)
    const deadline = addDays(T, r.int(-5, 70))
    const status: Goal['status'] = progress >= 1 ? 'completed' : progress > 0.66 ? 'on-track' : progress > 0.4 ? 'at-risk' : 'behind'
    return {
      id: `g_${i + 1}`, empId: `emp_${idx}`, title, description, metric: title, target, current, unit, deadline,
      createdAt: addDays(T, -r.int(30, 80)), status, weight,
      updates: [
        { date: addDays(T, -r.int(20, 30)), text: 'Kick-off and plan agreed with manager.', value: Math.round(current * 0.3) },
        { date: addDays(T, -r.int(3, 12)), text: 'Mid-way check-in.', value: current },
      ],
    }
  })

  // ---------- statutory & payroll ----------
  const statutory = {
    pfEnabled: true, pfEmployeePct: 12, pfEmployerPct: 12, pfWageCeiling: 15000, pfUseCeiling: true,
    esiEnabled: true, esiEmployeePct: 0.75, esiEmployerPct: 3.25, esiGrossLimit: 21000,
    ptEnabled: false, ptState: 'Uttar Pradesh', tdsEnabled: true, showEmployerOnPayslip: true, payDay: 1,
  }

  const partial = {
    employees, attendance, leaveTypes, leaves, salaries, statutory,
  } as unknown as DB
  const payrollRuns: PayrollRun[] = [2, 1].map((back, i) => {
    const d = parseISO(T)
    const ref = toISO(new Date(d.getFullYear(), d.getMonth() - back, 1))
    const from = startOfMonth(ref), to = endOfMonth(ref)
    const m = parseISO(from)
    return {
      id: `pr_${i + 1}`, label: `${monthName(m.getMonth(), true)} ${m.getFullYear()}`, from, to,
      status: 'paid', createdAt: addDays(to, 1), paidOn: addDays(to, 1), lines: buildPayrollLines(partial, from, to),
    }
  })

  // ---------- announcements ----------
  const bday = employees[6]!
  const announcements: Announcement[] = [
    { id: 'an_1', kind: 'notice', title: 'Diwali holidays & office closure', body: 'The office will remain closed on 8th and 9th November for Diwali and Govardhan Puja. Wishing everyone a bright and joyful festival with family! Please plan your deliverables accordingly.', pinned: true, status: 'published', createdAt: addDays(T, -2), expiresAt: addDays(T, 16), audience: 'All employees', reads: 19 },
    { id: 'an_2', kind: 'notice', title: 'Updated leave policy — effective 1st November', body: 'Earned Leave can now be carried forward up to 15 days. Sick leave above 2 consecutive days needs a medical certificate. Read the full policy in Company Policies.', pinned: false, status: 'published', createdAt: addDays(T, -6), audience: 'All employees', reads: 21 },
    { id: 'an_3', kind: 'notice', title: 'Submit investment proofs for TDS', body: 'Please upload your 80C / 80D investment proofs by the 15th of next month so we can compute accurate TDS for the remaining quarter.', pinned: false, status: 'scheduled', publishAt: addDays(T, 3), createdAt: addDays(T, -1), audience: 'All employees', reads: 0 },
    { id: 'an_4', kind: 'event', title: 'Diwali celebration & potluck', body: 'Rangoli competition, secret santa and potluck lunch on the terrace. Dress code: ethnic.', eventDate: addDays(T, 11), eventTime: '15:00', venue: 'Noida HQ — Terrace', pinned: true, status: 'published', createdAt: addDays(T, -4), audience: 'All employees', reads: 22 },
    { id: 'an_5', kind: 'event', title: 'Quarterly town hall', body: 'Q3 business review, product roadmap and awards. Remote folks will receive a Meet link.', eventDate: addDays(T, 19), eventTime: '11:00', venue: 'Conference room + Google Meet', pinned: false, status: 'published', createdAt: addDays(T, -3), audience: 'All employees', reads: 17 },
    { id: 'an_6', kind: 'event', title: 'Design critique', body: 'Monthly design critique — bring work in progress.', eventDate: addDays(T, 5), eventTime: '16:30', venue: 'Huddle room', pinned: false, status: 'published', createdAt: addDays(T, -1), audience: 'Design', reads: 4 },
    { id: 'an_7', kind: 'alert', title: 'Internet maintenance tonight', body: 'ISP maintenance between 10 PM and 1 AM. Please push your work before you leave.', pinned: false, status: 'published', createdAt: addDays(T, 0), expiresAt: addDays(T, 1), audience: 'All employees', reads: 12 },
    { id: 'an_8', kind: 'alert', title: 'Phishing attempt reported', body: 'Do not open emails claiming to be from “HR Payroll Update” with attachments. Report to IT immediately.', pinned: true, status: 'published', createdAt: addDays(T, -5), audience: 'All employees', reads: 23 },
    { id: 'an_9', kind: 'birthday', title: `Happy Birthday, ${employees[13]!.name}!`, body: `Today is ${employees[13]!.name}'s birthday. Wish them a wonderful day!`, pinned: false, status: 'published', createdAt: addDays(T, -14), audience: 'All employees', reads: 20, empId: 'emp_14' },
    { id: 'an_10', kind: 'birthday', title: `Happy Birthday, ${employees[4]!.name}!`, body: `Today is ${employees[4]!.name}'s birthday. Wish them a wonderful day!`, pinned: false, status: 'published', createdAt: addDays(T, -41), audience: 'All employees', reads: 18, empId: 'emp_5' },
  ]
  void bday

  // ---------- mail ----------
  const now = new Date()
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
  const mails: Mail[] = [
    { id: 'm_1', folder: 'inbox', from: { name: 'Karan Mehta', email: 'karan.mehta@gmail.com' }, to: ['hrteam@surfsyncinfotech.in'], subject: 'Re: Offer letter — Android Developer', body: 'Hi team,\n\nThank you for the offer. I have a couple of questions about the probation period and whether the joining date can move by a week. Could we connect tomorrow?\n\nRegards,\nKaran', date: ago(1.2), read: false, starred: true, labels: ['Hiring'] },
    { id: 'm_2', folder: 'inbox', from: { name: 'Razorpay Payroll', email: 'payroll@razorpay.com' }, to: ['hrteam@surfsyncinfotech.in'], subject: 'Your September payout was successful', body: 'All salary transfers for September have been credited. 21 transfers, 0 failures. Download the bank statement from your dashboard.', date: ago(5), read: false, starred: false, labels: ['Payroll'], attachments: [{ name: 'payout-report-sep.pdf', size: '182 KB' }] },
    { id: 'm_3', folder: 'inbox', from: { name: 'Rishu Kumar', email: 'rishu@surfsyncinfotech.in' }, to: ['hrteam@surfsyncinfotech.in'], subject: 'Internship completion certificate', body: 'Hello HR,\n\nMy internship ends next month. Could you share the process for the completion certificate and a possible full-time conversion?\n\nThanks,\nRishu', date: ago(9), read: true, starred: false },
    { id: 'm_4', folder: 'inbox', from: { name: 'Naukri Recruiter', email: 'alerts@naukri.com' }, to: ['hrteam@surfsyncinfotech.in'], subject: '23 new applicants for “Android Developer”', body: '23 candidates applied in the last 48 hours. 6 match more than 80% of your requirements.', date: ago(20), read: true, starred: false, labels: ['Hiring'] },
    { id: 'm_5', folder: 'inbox', from: { name: 'Richa Sharma', email: 'richa@surfsyncinfotech.in' }, to: ['hrteam@surfsyncinfotech.in'], subject: 'Reimbursement — client travel', body: 'Hi, attaching cab bills for the client visit to Gurugram on Tuesday. Total ₹1,840.', date: ago(28), read: true, starred: false, attachments: [{ name: 'cab-bills.pdf', size: '640 KB' }] },
    { id: 'm_6', folder: 'inbox', from: { name: 'Google Workspace', email: 'workspace-noreply@google.com' }, to: ['hrteam@surfsyncinfotech.in'], subject: 'Action needed: 2 licences unassigned', body: 'You have 2 Business Starter licences that are not assigned to any user.', date: ago(50), read: true, starred: false },
    { id: 'm_7', folder: 'inbox', from: { name: 'Meera Nair', email: 'meera@surfsyncinfotech.in' }, to: ['hrteam@surfsyncinfotech.in'], subject: 'Q4 hiring plan — final', body: 'Sharing the final Q4 hiring plan: 2 Android, 1 SEO, 1 Sales. Budget approved by Kabir.', date: ago(76), read: true, starred: true, attachments: [{ name: 'Q4-hiring-plan.xlsx', size: '38 KB' }] },
    { id: 'm_8', folder: 'sent', from: { name: 'SurfSync HR', email: 'hrteam@surfsyncinfotech.in' }, to: ['karan.mehta@gmail.com'], subject: 'Offer letter — Android Developer', body: 'Dear Karan,\n\nPlease find attached your offer letter. Kindly confirm your acceptance within 7 days.\n\nWarm regards,\nHR Team', date: ago(70), read: true, starred: false, attachments: [{ name: 'Offer_Karan_Mehta.pdf', size: '214 KB' }] },
    { id: 'm_9', folder: 'sent', from: { name: 'SurfSync HR', email: 'hrteam@surfsyncinfotech.in' }, to: ['all@surfsyncinfotech.in'], subject: 'Diwali holidays & office closure', body: 'Dear team,\n\nThe office will remain closed on 8th and 9th November.\n\nHappy Diwali!', date: ago(48), read: true, starred: false },
    { id: 'm_10', folder: 'scheduled', from: { name: 'SurfSync HR', email: 'hrteam@surfsyncinfotech.in' }, to: ['all@surfsyncinfotech.in'], subject: 'Reminder: submit investment proofs', body: 'Friendly reminder to upload your investment proofs by the 15th.', date: new Date(now.getTime() + 3 * 86400_000).toISOString(), read: true, starred: false },
    { id: 'm_11', folder: 'drafts', from: { name: 'SurfSync HR', email: 'hrteam@surfsyncinfotech.in' }, to: ['tanvi.joshi@gmail.com'], subject: 'Welcome to SurfSync — your first day', body: 'Hi Tanvi,\n\nWe are excited to have you join us! Here is what your first day looks like…', date: ago(3), read: true, starred: false },
  ]
  const mailTemplates = [
    { id: 'mt_1', name: 'Interview invitation', category: 'Hiring', subject: 'Interview invitation — {{role}} at SurfSync Infotech', body: 'Hi {{name}},\n\nThank you for applying for {{role}}. We would like to invite you for an interview on {{date}} at {{time}}.\n\nRegards,\nHR Team' },
    { id: 'mt_2', name: 'Welcome on board', category: 'Onboarding', subject: 'Welcome to SurfSync, {{name}}!', body: 'Hi {{name}},\n\nWelcome aboard! Your login is ready — please complete your profile and accept company policies before your first day.\n\nCheers,\nHR Team' },
    { id: 'mt_3', name: 'Payslip shared', category: 'Payroll', subject: 'Your payslip for {{month}}', body: 'Hi {{name}},\n\nYour payslip for {{month}} is now available in the HRMS app.\n\nThanks,\nPayroll' },
    { id: 'mt_4', name: 'Relieving letter', category: 'Exit', subject: 'Relieving letter — {{name}}', body: 'Dear {{name}},\n\nPlease find attached your relieving and experience letter. We wish you the very best.\n\nRegards,\nHR Team' },
  ]

  // ---------- roles ----------
  const all = (a: Access) => Object.fromEntries(MODULES.map((m) => [m, a])) as Record<Module, Access>
  const roles: Role[] = [
    { id: 'role_admin', name: 'Tenant Admin', description: 'Full control over every module and company settings.', permissions: all('full'), system: true, members: 1 },
    { id: 'role_hr', name: 'HR', description: 'Runs people operations end to end, except billing.', permissions: { ...all('full'), Settings: 'edit', Goals: 'edit' }, members: 2 },
    { id: 'role_manager', name: 'Manager', description: 'Approves leave and reports for their team, sets goals.', permissions: { ...all('view'), Leave: 'edit', 'Work Reports': 'edit', Goals: 'full', Payroll: 'none', Settings: 'none', Mail: 'none' }, members: 3 },
    { id: 'role_employee', name: 'Employee', description: 'Self-service: attendance, leave, reports and payslips.', permissions: { ...all('none'), Dashboard: 'view', Attendance: 'view', Leave: 'view', 'Work Reports': 'edit', Announcements: 'view', Goals: 'view' }, system: true, members: 18 },
  ]

  return {
    version: DB_VERSION,
    employees, attendance, leaveTypes, leaves, reports, offers, assets, goals, salaries, payrollRuns, statutory,
    announcements, mails, mailTemplates, branches, departments, teams, workLocations, shifts, holidays,
    policies: [
      { id: 'po_1', title: 'Code of Conduct', body: '1. Employees shall maintain complete professionalism during working hours.\n2. Harassment of any kind will not be tolerated.\n3. Company assets must be used responsibly.', requiresAcceptance: true, active: true, updatedAt: addDays(T, -60), acceptedBy: 21 },
      { id: 'po_2', title: 'Leave & Attendance Policy', body: 'Working hours are 9:00 AM – 6:00 PM with a 60 minute break. Check-ins after 15 minutes of shift start are marked late. Three late marks in a month count as half a day of LWP.', requiresAcceptance: true, active: true, updatedAt: addDays(T, -6), acceptedBy: 17 },
      { id: 'po_3', title: 'IT & Data Security', body: 'Use only company-approved tools for client data. Enable 2FA on every work account. Report suspicious emails to IT.', requiresAcceptance: true, active: true, updatedAt: addDays(T, -90), acceptedBy: 22 },
      { id: 'po_4', title: 'Work From Home', body: 'Remote days need manager approval a day in advance. Web check-in is mandatory.', requiresAcceptance: false, active: true, updatedAt: addDays(T, -120), acceptedBy: 0 },
    ],
    roles,
    company: {
      name: 'SurfSync Infotech', legalName: 'SurfSync Infotech Private Limited', email: 'hrteam@surfsyncinfotech.in', phone: '+91 94296 94356',
      website: 'https://surfsyncinfotech.in', industry: 'IT Services', size: '11–50 employees', gstin: '09ABCDS1234F1Z5', pan: 'ABCDS1234F',
      address: { line1: 'B-42, Sector 62', line2: 'Institutional Area', city: 'Noida', state: 'Uttar Pradesh', pincode: '201309', country: 'India' },
      timezone: 'Asia/Kolkata (IST)', currency: 'INR (₹)', fiscalYearStart: 'April',
    },
    branding: { tagline: 'Welcome to SurfSync Infotech', primary: '#F68713', secondary: '#2A9CB8', loginStyle: 'gradient' },
    notifications: [
      { id: 'n_1', kind: 'leave', title: 'New leave request', body: 'Nitesh Pawar requested 5 days of Casual Leave.', date: ago(0.6), read: false, link: '/approvals' },
      { id: 'n_2', kind: 'offer', title: 'Offer viewed', body: 'Karan Mehta opened the Android Developer offer letter.', date: ago(1.5), read: false, link: '/onboarding' },
      { id: 'n_3', kind: 'attendance', title: 'Late check-ins', body: '3 people checked in late today.', date: ago(2.5), read: false, link: '/attendance' },
      { id: 'n_4', kind: 'asset', title: 'Warranty expiring', body: 'HP ProBook 440 (AST-0005) warranty ends in 3 weeks.', date: ago(20), read: true, link: '/assets' },
      { id: 'n_5', kind: 'payroll', title: 'Payroll processed', body: `${payrollRuns[1]!.label} payroll was marked as paid.`, date: ago(60), read: true, link: '/payroll' },
      { id: 'n_6', kind: 'system', title: 'Setup almost done', body: 'Finish Roles & Permissions to complete company setup.', date: ago(100), read: true, link: '/settings/roles' },
    ],
    activity: [
      { id: 'a_1', date: ago(0.5), actor: 'Nitesh Pawar', text: 'requested 5 days of Casual Leave', kind: 'leave' },
      { id: 'a_2', date: ago(1.4), actor: 'Karan Mehta', text: 'viewed the Android Developer offer', kind: 'offer' },
      { id: 'a_3', date: ago(3), actor: 'Meera Nair', text: 'approved 7 work reports', kind: 'report' },
      { id: 'a_4', date: ago(6), actor: 'You', text: 'assigned MacBook Air M1 to Rohan Gupta', kind: 'asset' },
      { id: 'a_5', date: ago(26), actor: 'You', text: 'published “Diwali holidays & office closure”', kind: 'system' },
      { id: 'a_6', date: ago(52), actor: 'You', text: `marked ${payrollRuns[1]!.label} payroll as paid`, kind: 'payroll' },
    ],
    setupDone: ['profile', 'branding', 'branches', 'departments', 'teams', 'locations', 'holidays', 'shifts', 'leave', 'policies'],
  }
}
