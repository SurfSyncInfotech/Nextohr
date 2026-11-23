import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, IconButton } from './Button'

function useOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]):not([disabled]), textarea, select, button:not([data-close])')
      el?.focus()
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        const list = Array.from(f).filter((x) => !x.hasAttribute('disabled'))
        if (!list.length) return
        const first = list[0]!, last = list[list.length - 1]!
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.()
    }
  }, [open, onClose])
  return panel
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', icon }: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'; icon?: ReactNode
}) {
  const panel = useOverlay(open, onClose)
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-[#0b1118]/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        className={cn('relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-pop sm:rounded-3xl', w)}>
        <header className="flex items-start gap-3 border-b border-line px-6 pb-4 pt-5">
          {icon && <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-subtle">{description}</p>}
          </div>
          <IconButton data-close label="Close" size="icon-sm" onClick={onClose} icon={<X className="h-4 w-4" />} />
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-6 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl', headerExtra }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: string; headerExtra?: ReactNode
}) {
  const panel = useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-[#0b1118]/35" onClick={onClose} aria-hidden />
      <aside ref={panel} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        className={cn('relative flex h-full w-full animate-slide-in flex-col border-l border-line bg-surface shadow-pop', width)}>
        <header className="flex items-start gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-subtle">{subtitle}</div>}
          </div>
          {headerExtra}
          <IconButton data-close label="Close" size="icon-sm" onClick={onClose} icon={<X className="h-4 w-4" />} />
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-6 py-3.5">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Delete', tone = 'danger', loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; loading?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title}
      icon={tone === 'danger' ? <AlertTriangle className="h-5 w-5 text-danger" /> : undefined}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="text-sm leading-relaxed text-muted">{body}</div>
    </Modal>
  )
}

/** Lightweight anchored menu (click to open, closes on outside click / Escape). */
export function Menu({ trigger, children, align = 'end', width = 'w-56' }: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode); align?: 'start' | 'end'; width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const close = () => setOpen(false)
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div role="menu" className={cn('absolute top-full z-40 mt-1.5 animate-pop-in rounded-xl border border-line bg-surface p-1.5 shadow-pop', width, align === 'end' ? 'right-0' : 'left-0')}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, children, onClick, danger, hint }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; danger?: boolean; hint?: ReactNode }) {
  return (
    <button role="menuitem" type="button" onClick={onClick}
      className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-surface-3')}>
      {icon && <span className={cn('flex h-4 w-4 items-center', !danger && 'text-subtle')}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </button>
  )
}
export const MenuDivider = () => <div className="my-1 h-px bg-line" />
