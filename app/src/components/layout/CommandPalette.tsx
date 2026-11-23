import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CornerDownLeft, FileText, Package, Plus, Search, UserRound } from 'lucide-react'
import { useDb } from '@/data/db'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { NAV, SETTINGS_NAV } from './nav'

interface Item { id: string; group: string; label: string; sub?: string; icon: React.ReactNode; run: () => void; keywords?: string }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const { employees, assets, offers } = useDb((db) => ({ employees: db.employees, assets: db.assets, offers: db.offers }))

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => input.current?.focus(), 20) } }, [open])

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => { nav(to); onClose() }
    const actions: Item[] = [
      { id: 'a-emp', group: 'Quick actions', label: 'Add employee', icon: <Plus className="h-4 w-4" />, run: go('/people/new'), keywords: 'new hire create' },
      { id: 'a-offer', group: 'Quick actions', label: 'Create offer letter', icon: <Plus className="h-4 w-4" />, run: go('/onboarding/offer/new'), keywords: 'generate' },
      { id: 'a-pay', group: 'Quick actions', label: 'Run payroll', icon: <Plus className="h-4 w-4" />, run: go('/payroll/run'), keywords: 'salary process' },
      { id: 'a-ann', group: 'Quick actions', label: 'Post announcement', icon: <Plus className="h-4 w-4" />, run: go('/announcements?compose=notice'), keywords: 'notice' },
      { id: 'a-asset', group: 'Quick actions', label: 'Add asset', icon: <Plus className="h-4 w-4" />, run: go('/assets?new=1'), keywords: 'laptop' },
    ]
    const pages: Item[] = [...NAV.flatMap((g) => g.items), SETTINGS_NAV].map((n) => ({
      id: `p-${n.to}`, group: 'Go to', label: n.label, icon: <n.icon className="h-4 w-4" />, run: go(n.to), keywords: n.keywords,
    }))
    const people: Item[] = employees.map((e) => ({
      id: `e-${e.id}`, group: 'People', label: e.name, sub: `${e.designation} · ${e.code}`,
      icon: <Avatar name={e.name} hue={e.avatarHue} size={22} />, run: go(`/people/${e.id}`), keywords: `${e.email} ${e.department}`,
    }))
    const assetItems: Item[] = assets.map((a) => ({
      id: `as-${a.id}`, group: 'Assets', label: a.name, sub: `${a.code} · ${a.serial}`, icon: <Package className="h-4 w-4" />, run: go(`/assets?open=${a.id}`),
    }))
    const offerItems: Item[] = offers.map((o) => ({
      id: `of-${o.id}`, group: 'Offer letters', label: o.candidateName, sub: o.designation, icon: <FileText className="h-4 w-4" />, run: go(`/onboarding/offer/${o.id}`),
    }))
    return [...actions, ...pages, ...people, ...assetItems, ...offerItems]
  }, [employees, assets, offers, nav, onClose])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items.filter((i) => i.group === 'Quick actions' || i.group === 'Go to')
    return items.filter((i) => `${i.label} ${i.sub ?? ''} ${i.keywords ?? ''}`.toLowerCase().includes(s)).slice(0, 40)
  }, [q, items])

  useEffect(() => { setIdx(0) }, [q])
  useEffect(() => { list.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' }) }, [idx])

  if (!open) return null
  const groups = Array.from(new Set(filtered.map((f) => f.group)))
  let i = -1

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-[#0b1118]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((x) => Math.min(filtered.length - 1, x + 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((x) => Math.max(0, x - 1)) }
          if (e.key === 'Enter') filtered[idx]?.run()
        }}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-subtle" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, assets, pages or actions…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-subtle focus:outline-none" aria-label="Search" />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-subtle">ESC</kbd>
        </div>
        <div ref={list} className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-subtle">
              <UserRound className="h-6 w-6" /> No matches for “{q}”
            </div>
          )}
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <div className="px-2.5 pb-1 pt-2 label-xs">{g}</div>
              {filtered.filter((f) => f.group === g).map((f) => {
                i++
                const me = i
                return (
                  <button key={f.id} data-idx={me} onMouseMove={() => setIdx(me)} onClick={f.run}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left', idx === me ? 'bg-primary-soft' : '')}>
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', idx === me ? 'bg-surface text-primary-ink' : 'bg-surface-3 text-muted')}>{f.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{f.label}</span>
                      {f.sub && <span className="block truncate text-xs text-subtle">{f.sub}</span>}
                    </span>
                    {idx === me ? <CornerDownLeft className="h-4 w-4 text-primary-ink" /> : <ArrowRight className="h-4 w-4 text-transparent" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-[11px] font-semibold text-subtle">
          <span>↑↓ to navigate</span><span>↵ to open</span><span className="ml-auto">Ctrl K anywhere</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
