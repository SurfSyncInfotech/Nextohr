import type { ReactNode } from 'react'
import type { TooltipProps } from 'recharts'

export const C = {
  orange: '#F68713',
  orangeSoft: '#FDD09F',
  blue: '#2A9CB8',
  blueSoft: '#AEE2EF',
  green: '#16A34A',
  red: '#DC2626',
  grid: 'rgb(var(--line))',
  axis: 'rgb(var(--subtle))',
}

export const axisProps = {
  tick: { fill: C.axis, fontSize: 12, fontFamily: 'Manrope' },
  tickLine: false,
  axisLine: false,
} as const

export function ChartTooltip({ active, payload, label, format, labelFormat }: TooltipProps<number, string> & {
  format?: (v: number, name: string) => ReactNode; labelFormat?: (l: string) => ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[150px] rounded-xl border border-line bg-surface px-3 py-2.5 shadow-pop">
      <p className="mb-1.5 text-xs font-bold text-ink">{labelFormat ? labelFormat(String(label)) : label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? (p.payload as { fill?: string })?.fill }} />
            <span className="flex-1 text-muted">{p.name}</span>
            <span className="num font-bold text-ink">{format ? format(Number(p.value), String(p.name)) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
