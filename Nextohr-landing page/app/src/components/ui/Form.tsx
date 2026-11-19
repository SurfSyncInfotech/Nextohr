import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check, ChevronDown, Search, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const control =
  'w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-subtle/80 transition-[border,box-shadow] ' +
  'hover:border-subtle/50 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:bg-surface-3 disabled:text-subtle aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15'

export function Field({ label, hint, error, required, children, className, htmlFor }: {
  label?: ReactNode; hint?: ReactNode; error?: string; required?: boolean; children: ReactNode; className?: string; htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-danger" role="alert">{error}</p> : hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode; trailing?: ReactNode }>(
  function Input({ className, leading, trailing, ...rest }, ref) {
    if (!leading && !trailing) return <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />
    return (
      <div className={cn('relative flex items-center', className)}>
        {leading && <span className="pointer-events-none absolute left-3 flex text-subtle">{leading}</span>}
        <input ref={ref} className={cn(control, 'h-10', leading && 'pl-9', trailing && 'pr-10')} {...rest} />
        {trailing && <span className="absolute right-2 flex">{trailing}</span>}
      </div>
    )
  },
)

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <Input
      className={cn('min-w-0', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      leading={<Search className="h-4 w-4" />}
      trailing={value ? (
        <button type="button" onClick={() => onChange('')} className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-ink" aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : undefined}
    />
  )
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options?: (string | { value: string; label: string })[] }>(
  function Select({ className, options, children, ...rest }, ref) {
    return (
      <div className={cn('relative', className)}>
        <select ref={ref} className={cn(control, 'h-10 appearance-none pr-9')} {...rest}>
          {options?.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      </div>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-[96px] py-2.5 leading-relaxed', className)} {...rest} />
})

export function Checkbox({ checked, onChange, label, description, indeterminate, className, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; indeterminate?: boolean; className?: string; disabled?: boolean
}) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('inline-flex cursor-pointer items-start gap-2.5 select-none', disabled && 'cursor-not-allowed opacity-60', className)}>
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} disabled={disabled}
          ref={(el) => { if (el) el.indeterminate = !!indeterminate }} onChange={(e) => onChange(e.target.checked)} />
        <span className={cn(
          'flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/25',
          checked || indeterminate ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface',
        )}>
          {indeterminate ? <span className="h-0.5 w-2.5 rounded bg-current" /> : checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-subtle">{description}</span>}
        </span>
      )}
    </label>
  )
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="text-xs text-subtle">{description}</span>}
        </span>
      )}
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:shadow-ring', checked ? 'bg-primary' : 'bg-line-strong')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export function FileDrop({ label, accept, value, onChange, hint, multiple }: {
  label: string; accept?: string; value?: string | string[]; onChange: (names: string[]) => void; hint?: string; multiple?: boolean
}) {
  const id = useId()
  const names = Array.isArray(value) ? value : value ? [value] : []
  return (
    <div>
      <label htmlFor={id}
        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2 px-3.5 py-3 transition-colors hover:border-blue-500 hover:bg-accent-soft"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onChange(Array.from(e.dataTransfer.files).map((f) => f.name)) }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-blue-600 shadow-card dark:text-blue-300"><UploadCloud className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block truncate text-xs text-subtle">{names.length ? names.join(', ') : hint ?? 'Drag a file here or click to browse'}</span>
        </span>
        {names.length > 0 && <Check className="h-4 w-4 text-success" />}
      </label>
      <input id={id} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => onChange(Array.from(e.target.files ?? []).map((f) => f.name))} />
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className={cn('scroll-thin inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface-3 p-1', className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} type="button" onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-all',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}>
          {o.label}
          {o.count !== undefined && (
            <span className={cn('num rounded-md px-1.5 text-[11px]', value === o.value ? 'bg-primary-soft text-primary-ink' : 'bg-surface text-subtle')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
