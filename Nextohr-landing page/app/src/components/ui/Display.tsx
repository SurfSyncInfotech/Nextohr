import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import type { Employee } from '@/data/types'

export type Tone = 'neutral' | 'orange' | 'blue' | 'success' | 'warning' | 'danger' | 'violet'
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-muted ring-line-strong/60',
  orange: 'bg-primary-soft text-primary-ink ring-primary/25',
  blue: 'bg-accent-soft text-accent-ink ring-accent/25',
  success: 'bg-success-soft text-success ring-success/25',
  warning: 'bg-warning-soft text-[rgb(161_98_7)] dark:text-warning ring-warning/30',
  danger: 'bg-danger-soft text-danger ring-danger/25',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
}

export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const STATUS: Record<string, [Tone, string]> = {
  active: ['success', 'Active'], inactive: ['neutral', 'Inactive'], onboarding: ['blue', 'Onboarding'], notice: ['warning', 'On notice'],
  pending: ['warning', 'Pending'], approved: ['success', 'Approved'], rejected: ['danger', 'Rejected'], cancelled: ['neutral', 'Cancelled'],
  present: ['success', 'Present'], late: ['warning', 'Late'], 'half-day': ['violet', 'Half day'], absent: ['danger', 'Absent'],
  leave: ['blue', 'On leave'], holiday: ['neutral', 'Holiday'], weekend: ['neutral', 'Weekly off'], 'not-in': ['neutral', 'Not checked in'],
  draft: ['neutral', 'Draft'], sent: ['blue', 'Sent'], accepted: ['success', 'Accepted'], declined: ['danger', 'Declined'],
  available: ['success', 'Available'], assigned: ['blue', 'Assigned'], repair: ['warning', 'In repair'], retired: ['neutral', 'Retired'],
  'on-track': ['success', 'On track'], 'at-risk': ['warning', 'At risk'], behind: ['danger', 'Behind'], completed: ['blue', 'Completed'],
  processed: ['blue', 'Processed'], paid: ['success', 'Paid'], published: ['success', 'Published'], scheduled: ['violet', 'Scheduled'],
}
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const [tone, text] = STATUS[status] ?? ['neutral', status]
  return <Badge tone={tone} dot>{label ?? text}</Badge>
}

export function Avatar({ name, hue = 24, size = 36, className, ring }: { name: string; hue?: number; size?: number; className?: string; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold', ring && 'ring-2 ring-surface', className)}
      style={{
        width: size, height: size, fontSize: Math.max(10, size * 0.36),
        background: `hsl(${hue} 80% 92%)`, color: `hsl(${hue} 55% 30%)`,
      }}
    >
      {initials(name)}
    </span>
  )
}

export function Person({ emp, sub, size = 36, link = true, className }: { emp?: Employee; sub?: ReactNode; size?: number; link?: boolean; className?: string }) {
  if (!emp) return <span className="text-subtle">—</span>
  const name = <span className="block truncate font-semibold text-ink">{emp.name}</span>
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar name={emp.name} hue={emp.avatarHue} size={size} />
      <div className="min-w-0 leading-tight">
        {link ? <Link to={`/people/${emp.id}`} className="hover:text-primary-ink hover:underline" onClick={(e) => e.stopPropagation()}>{name}</Link> : name}
        <span className="mt-0.5 block truncate text-xs text-subtle">{sub ?? emp.designation}</span>
      </div>
    </div>
  )
}

export function AvatarStack({ people, max = 4, size = 28 }: { people: Employee[]; max?: number; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, max).map((p) => <Avatar key={p.id} name={p.name} hue={p.avatarHue} size={size} ring />)}
      {people.length > max && (
        <span className="inline-flex items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold text-muted ring-2 ring-surface" style={{ width: size, height: size }}>
          +{people.length - max}
        </span>
      )}
    </div>
  )
}

export function Card({ title, subtitle, action, children, className, bodyClass, icon }: {
  title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; bodyClass?: string; icon?: ReactNode
}) {
  return (
    <section className={cn('card', className)}>
      {(title || action) && (
        <header className="flex items-start gap-3 px-5 pb-1 pt-4">
          {icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted">{icon}</span>}
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[13px] text-subtle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('px-5 pb-5 pt-3', bodyClass)}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, delta, deltaLabel, icon, tone = 'orange', invert, onClick, footnote }: {
  label: string; value: ReactNode; delta?: number; deltaLabel?: string; icon?: ReactNode; tone?: 'orange' | 'blue' | 'success' | 'danger' | 'violet' | 'neutral'
  invert?: boolean; onClick?: () => void; footnote?: ReactNode
}) {
  const good = delta === undefined ? undefined : invert ? delta < 0 : delta >= 0
  const iconTone = {
    orange: 'bg-primary-soft text-primary-ink', blue: 'bg-accent-soft text-accent-ink', success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger', violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', neutral: 'bg-surface-3 text-muted',
  }[tone]
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={cn('card flex flex-col gap-3 p-4 text-left', onClick && 'transition-[border,box-shadow] hover:border-line-strong hover:shadow-pop')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        {icon && <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconTone)}>{icon}</span>}
      </div>
      <div className="num text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</div>
      <div className="flex min-h-[18px] items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold', good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}{deltaLabel ?? '%'}
          </span>
        )}
        {footnote && <span className="truncate text-subtle">{footnote}</span>}
      </div>
    </Comp>
  )
}

export function Progress({ value, tone = 'orange', className, size = 'md' }: { value: number; tone?: 'orange' | 'blue' | 'success' | 'warning' | 'danger'; className?: string; size?: 'sm' | 'md' }) {
  const bg = { orange: 'bg-primary', blue: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone]
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-subtle">{icon}</span>}
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-subtle">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5 text-[13px] font-semibold text-subtle">{eyebrow}</div>}
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-subtle">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number; icon?: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_rgb(var(--line))]', className)}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn('relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
            value === t.value ? 'border-primary text-ink' : 'border-transparent text-subtle hover:text-ink')}>
          {t.icon}
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className={cn('num rounded-full px-1.5 py-px text-[11px] font-bold', value === t.value ? 'bg-primary text-on-primary' : 'bg-surface-3 text-muted')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} />
}

export function KeyValue({ items, cols = 2 }: { items: [ReactNode, ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-semibold text-subtle">{k}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-ink">{v || <span className="text-subtle">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ background: color }} aria-hidden />
}
