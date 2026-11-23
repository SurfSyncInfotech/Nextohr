import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'info'
interface ToastItem { id: number; tone: Tone; title: string; body?: string; action?: { label: string; onClick: () => void } }

let items: ToastItem[] = []
const subs = new Set<() => void>()
const emit = () => subs.forEach((s) => s())
let n = 0

function push(tone: Tone, title: string, opts: Omit<ToastItem, 'id' | 'tone' | 'title'> = {}) {
  const id = ++n
  items = [...items.slice(-3), { id, tone, title, ...opts }]
  emit()
  setTimeout(() => dismiss(id), opts.action ? 6500 : 3800)
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  success: (title: string, o?: Omit<ToastItem, 'id' | 'tone' | 'title'>) => push('success', title, o),
  error: (title: string, o?: Omit<ToastItem, 'id' | 'tone' | 'title'>) => push('error', title, o),
  info: (title: string, o?: Omit<ToastItem, 'id' | 'tone' | 'title'>) => push('info', title, o),
}

export function Toaster() {
  const list = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb) }, () => items)
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
      {list.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? XCircle : Info
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-pop">
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', t.tone === 'success' ? 'text-success' : t.tone === 'error' ? 'text-danger' : 'text-blue-500')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] text-subtle">{t.body}</p>}
            </div>
            {t.action && (
              <button className="rounded-lg px-2 py-1 text-[13px] font-bold text-primary-ink hover:bg-primary-soft" onClick={() => { t.action!.onClick(); dismiss(t.id) }}>
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-ink" aria-label="Dismiss notification"><X className="h-3.5 w-3.5" /></button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
