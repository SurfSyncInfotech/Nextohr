import { clsx, type ClassValue } from 'clsx'
import type { ISODate } from '@/data/types'

export const cn = (...v: ClassValue[]) => clsx(v)

// ---------- dates (local-time, YYYY-MM-DD strings) ----------
export const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s: ISODate) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const today = () => toISO(new Date())
export const addDays = (s: ISODate, n: number) => {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const diffDays = (a: ISODate, b: ISODate) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000)
export const isSunday = (s: ISODate) => parseISO(s).getDay() === 0
export const startOfMonth = (s: ISODate) => s.slice(0, 8) + '01'
export const endOfMonth = (s: ISODate) => {
  const d = parseISO(s)
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
export const eachDay = (from: ISODate, to: ISODate) => {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const monthName = (m: number, long = false) =>
  long ? new Date(2000, m, 1).toLocaleString('en-IN', { month: 'long' }) : MONTHS[m]
export const fmtDate = (s?: ISODate) => {
  if (!s) return '—'
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export const fmtShort = (s: ISODate) => {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const fmtDay = (s: ISODate) => DAYS[parseISO(s).getDay()]
export const fmtRange = (a: ISODate, b: ISODate) => (a === b ? fmtDate(a) : `${fmtShort(a)} – ${fmtDate(b)}`)
export const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${pad(m)} ${ap}`
}
export const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const fmtMins = (mins: number) => `${Math.floor(mins / 60)}h ${pad(Math.round(mins % 60))}m`
export const relTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return fmtDate(iso.slice(0, 10))
}
export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// ---------- numbers ----------
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n: number) => inr.format(Math.round(n))
export const compactMoney = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`
  return money(n)
}
export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

// ---------- misc ----------
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`
export const plural = (n: number, word: string, pluralWord = word + 's') => `${n} ${n === 1 ? word : pluralWord}`

/** Deterministic PRNG so seeded demo data is stable between reloads. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)]!,
    chance: (p: number) => next() < p,
  }
}

export function downloadFile(name: string, content: string, type = 'text/csv') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0]!)
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
}
