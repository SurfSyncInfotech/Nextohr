import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'soft' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-primary bg-gradient-to-b from-primary to-primary-strong text-on-primary [text-shadow:0_1px_1px_rgb(120_50_0/0.25)] shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_-1px_0_rgb(0_0_0/0.10),0_1px_2px_rgb(226_108_4/0.35)] hover:brightness-[1.05] active:brightness-95 dark:[text-shadow:none]',
  accent: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-[#04232b] dark:hover:bg-blue-400',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2 hover:border-subtle/40',
  ghost: 'text-muted hover:text-ink hover:bg-surface-3',
  soft: 'bg-primary-soft text-primary-ink hover:bg-primary/15',
  danger: 'bg-danger text-white hover:brightness-110 dark:text-[#2a0606]',
  success: 'bg-success text-white hover:brightness-110 dark:text-[#04220f]',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-[background,color,border,filter,box-shadow] duration-150',
        'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-ring',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  )
})

export function IconButton({ label, className, size = 'icon', variant = 'ghost', ...rest }: ButtonProps & { label: string }) {
  return <Button aria-label={label} title={label} size={size} variant={variant} className={className} {...rest} />
}
