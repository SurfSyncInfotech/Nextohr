import {
  BarChart3, Briefcase, CalendarCheck2, CalendarDays, ClipboardList, Inbox, LayoutDashboard, Mail, Megaphone, Package,
  Settings, Target, UserPlus, Users, Wallet, type LucideIcon,
} from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon; badge?: 'approvals' | 'reports' | 'mail' | 'leave' | 'onboarding'; keywords?: string }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home insights analytics' },
      { to: '/approvals', label: 'Approvals', icon: Inbox, badge: 'approvals', keywords: 'pending requests queue inbox' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/people', label: 'Employees', icon: Users, keywords: 'staff directory team add employee' },
      { to: '/onboarding', label: 'Hiring & Onboarding', icon: UserPlus, badge: 'onboarding', keywords: 'offer letters candidates invite' },
      { to: '/assets', label: 'Assets', icon: Package, keywords: 'laptop inventory devices' },
    ],
  },
  {
    label: 'Time',
    items: [
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck2, keywords: 'check in gps late present' },
      { to: '/leave', label: 'Leave', icon: CalendarDays, badge: 'leave', keywords: 'time off holidays vacation sick' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { to: '/goals', label: 'Goals', icon: Target, keywords: 'targets kpi okr performance' },
      { to: '/reports', label: 'Work Reports', icon: ClipboardList, badge: 'reports', keywords: 'daily work report dwr' },
    ],
  },
  {
    label: 'Finance',
    items: [{ to: '/payroll', label: 'Payroll', icon: Wallet, keywords: 'salary payslip pf esi tds' }],
  },
  {
    label: 'Engage',
    items: [
      { to: '/announcements', label: 'Announcements', icon: Megaphone, keywords: 'notice events alerts birthdays' },
      { to: '/mail', label: 'Mail', icon: Mail, badge: 'mail', keywords: 'email inbox compose' },
    ],
  },
]

export const SETTINGS_NAV: NavItem = { to: '/settings', label: 'Company settings', icon: Settings, keywords: 'setup branding departments shifts roles' }
export const ICONS = { BarChart3, Briefcase }
