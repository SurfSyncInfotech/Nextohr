import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from './Form'
import { EmptyState } from './Display'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  sort?: (row: T) => string | number
  className?: string
  headerClass?: string
  align?: 'left' | 'right' | 'center'
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

export function DataTable<T>({
  rows, columns, rowKey, onRowClick, selectable, selected, onSelectedChange, bulkActions, empty, pageSize: initialPageSize = 10,
  defaultSort, dense, className, rowClass, footer,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  selectable?: boolean
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  bulkActions?: ReactNode
  empty?: ReactNode
  pageSize?: number
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  dense?: boolean
  className?: string
  rowClass?: (row: T) => string | undefined
  footer?: ReactNode
}) {
  const [sort, setSort] = useState(defaultSort)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const s = [...rows].sort((a, b) => {
      const x = col.sort!(a), y = col.sort!(b)
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    })
    return sort.dir === 'desc' ? s.reverse() : s
  }, [rows, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => { if (page > pages - 1) setPage(0) }, [pages, page])
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize)
  const sel = selected ?? []
  const visibleIds = visible.map(rowKey)
  const allOnPage = visibleIds.length > 0 && visibleIds.every((id) => sel.includes(id))
  const someOnPage = visibleIds.some((id) => sel.includes(id))

  const toggleAll = () => onSelectedChange?.(allOnPage ? sel.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...sel, ...visibleIds])))
  const toggle = (id: string) => onSelectedChange?.(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])

  return (
    <div className={cn('card relative overflow-hidden', className)}>
      {selectable && sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-soft/60 px-4 py-2.5">
          <span className="text-sm font-bold text-primary-ink">{sel.length} selected</span>
          <button className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-muted hover:bg-surface hover:text-ink" onClick={() => onSelectedChange?.([])}>
            <X className="h-3 w-3" /> Clear
          </button>
          <div className="ml-auto flex flex-wrap gap-2">{bulkActions}</div>
        </div>
      )}
      <div className="scroll-thin relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {selectable && (
                <th className="w-10 py-3 pl-4 pr-1">
                  <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} scope="col"
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('whitespace-nowrap px-4 py-3 text-left text-[12px] font-bold uppercase tracking-[0.06em] text-subtle',
                      c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideBelow && hide[c.hideBelow], c.headerClass)}>
                    {c.sort ? (
                      <button className={cn('inline-flex items-center gap-1 rounded hover:text-ink', active && 'text-ink')}
                        onClick={() => setSort(active && sort!.dir === 'asc' ? { key: c.key, dir: 'desc' } : active && sort!.dir === 'desc' ? undefined : { key: c.key, dir: 'asc' })}>
                        {c.header}
                        {active ? sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                      </button>
                    ) : c.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const id = rowKey(row)
              const isSel = sel.includes(id)
              return (
                <tr key={id} onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('border-b border-line last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-2', isSel && 'bg-primary-soft/40', rowClass?.(row))}>
                  {selectable && (
                    <td className="w-10 py-3 pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onChange={() => toggle(id)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 align-middle text-ink', dense ? 'py-2.5' : 'py-3.5',
                      c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideBelow && hide[c.hideBelow], c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (empty ?? <EmptyState title="Nothing to show" body="Try changing your filters." />)}
      </div>
      {footer}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px] text-subtle">
          <span className="num">
            Showing <b className="text-ink">{page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)}</b> of <b className="text-ink">{sorted.length}</b>
          </span>
          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-2 sm:flex">
              Rows
              <select className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-[13px] text-ink" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}>
                {[10, 20, 50, 100].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <span className="num px-2 font-semibold text-ink">{page + 1} / {pages}</span>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink disabled:opacity-40" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Toolbar row that sits above a table: search + filters on the left, actions on the right. */
export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
