import logo from '@/assets/logo.png'
import { cn } from '@/lib/utils'

/** The real SurfSync Infotech logo (transparent PNG). `chip` puts it on a white pill for coloured backgrounds. */
export function LogoFull({ className, height = 32, chip = false }: { className?: string; height?: number; chip?: boolean }) {
  const img = <img src={logo} alt="SurfSync Infotech" style={{ height }} className="w-auto max-w-full" />
  if (!chip) return <span className={cn('inline-flex items-center', className)}>{img}</span>
  return <span className={cn('inline-flex items-center rounded-xl bg-white px-2.5 py-1.5 shadow-card', className)}>{img}</span>
}
