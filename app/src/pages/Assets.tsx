import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Archive, Car, CreditCard, Headphones, Laptop, MoreHorizontal, Package, PackageCheck, PackagePlus, Pencil, Smartphone, Trash2, UserRound,
  Wrench, Boxes, Cpu, ArrowLeftRight,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap } from '@/data/selectors'
import type { Asset, AssetCategory } from '@/data/types'
import { addDays, cn, compactMoney, diffDays, fmtDate, money, today } from '@/lib/utils'
import {
  Badge, Button, ConfirmDialog, DataTable, Drawer, EmptyState, Field, IconButton, Input, KeyValue, Menu, MenuDivider, MenuItem, Modal,
  PageHeader, Person, SearchInput, Select, Stat, StatusBadge, Textarea, Toolbar, toast, type Column,
} from '@/components/ui'

export const CATEGORIES: { value: AssetCategory; icon: typeof Laptop }[] = [
  { value: 'Laptop', icon: Laptop }, { value: 'Phone', icon: Smartphone }, { value: 'SIM Card', icon: Cpu }, { value: 'ID Card', icon: CreditCard },
  { value: 'Vehicle', icon: Car }, { value: 'Accessories', icon: Headphones }, { value: 'Other', icon: Boxes },
]
const catIcon = (c: AssetCategory) => CATEGORIES.find((x) => x.value === c)?.icon ?? Package

export default function Assets() {
  const [params, setParams] = useSearchParams()
  const { assets, map } = useDb((db) => ({ assets: db.assets, map: empMap(db) }))
  const [cat, setCat] = useState<'' | AssetCategory>('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Partial<Asset> | null>(null)
  const [assign, setAssign] = useState<Asset | null>(null)
  const [del, setDel] = useState<Asset | null>(null)
  const openId = params.get('open')
  const open = assets.find((a) => a.id === openId)
  const setOpen = (id?: string) => { const p = new URLSearchParams(params); if (id) p.set('open', id); else p.delete('open'); setParams(p, { replace: true }) }

  useEffect(() => { if (params.get('new') === '1') { setForm({}); params.delete('new'); setParams(params, { replace: true }) } }, [params, setParams])

  const stats = useMemo(() => ({
    total: assets.length, value: assets.reduce((n, a) => n + a.cost, 0),
    assigned: assets.filter((a) => a.status === 'assigned').length, available: assets.filter((a) => a.status === 'available').length,
    repair: assets.filter((a) => a.status === 'repair').length,
    expiring: assets.filter((a) => a.warrantyExpiry && a.warrantyExpiry >= today() && a.warrantyExpiry <= addDays(today(), 60)),
  }), [assets])

  const rows = assets.filter((a) => (!cat || a.category === cat) && (!status || a.status === status) &&
    (!q || `${a.name} ${a.code} ${a.serial} ${a.specs} ${map.get(a.assignedTo ?? '')?.name ?? ''}`.toLowerCase().includes(q.toLowerCase())))

  const columns: Column<Asset>[] = [
    {
      key: 'name', header: 'Asset', sort: (a) => a.name,
      cell: (a) => { const I = catIcon(a.category); return (
        <div className="flex min-w-[220px] items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><I className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><p className="truncate text-xs text-subtle">{a.code} · {a.specs}</p></div>
        </div>
      ) },
    },
    { key: 'serial', header: 'Serial', hideBelow: 'xl', cell: (a) => <span className="num text-[13px] text-muted">{a.serial}</span> },
    { key: 'holder', header: 'Assigned to', sort: (a) => map.get(a.assignedTo ?? '')?.name ?? '~', cell: (a) => a.assignedTo ? <Person emp={map.get(a.assignedTo)} size={30} sub={`since ${fmtDate(a.assignedOn)}`} /> : <span className="text-subtle">—</span> },
    { key: 'cost', header: 'Value', align: 'right', sort: (a) => a.cost, hideBelow: 'md', cell: (a) => <span className="num font-semibold">{a.cost ? money(a.cost) : '—'}</span> },
    {
      key: 'warranty', header: 'Warranty', sort: (a) => a.warrantyExpiry ?? '9', hideBelow: 'lg',
      cell: (a) => {
        if (!a.warrantyExpiry) return <span className="text-subtle">—</span>
        const left = diffDays(today(), a.warrantyExpiry)
        return left < 0 ? <Badge>Expired</Badge> : left <= 60 ? <Badge tone="warning">{left} days left</Badge> : <span className="num text-[13px] text-muted">{fmtDate(a.warrantyExpiry)}</span>
      },
    },
    { key: 'status', header: 'Status', sort: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'act', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: (a) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {a.status === 'available' && <Button size="sm" onClick={() => setAssign(a)}>Assign</Button>}
          {a.status === 'assigned' && <Button size="sm" variant="ghost" onClick={async () => { await api.assets.assign(a.id, undefined); toast.success(`${a.name} returned to inventory`) }}>Return</Button>}
          <AssetMenu asset={a} onEdit={() => setForm(a)} onDelete={() => setDel(a)} onAssign={() => setAssign(a)} />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Assets" subtitle="Company devices, cards and vehicles — who has what, and what needs attention."
        actions={<Button variant="primary" icon={<PackagePlus className="h-4 w-4" />} onClick={() => setForm({})}>Add asset</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total assets" value={stats.total} icon={<Package className="h-4 w-4" />} footnote={`${compactMoney(stats.value)} inventory value`} />
        <Stat label="Assigned" value={stats.assigned} tone="blue" icon={<UserRound className="h-4 w-4" />} footnote={`${Math.round((stats.assigned / Math.max(1, stats.total)) * 100)}% utilisation`} onClick={() => setStatus('assigned')} />
        <Stat label="Available" value={stats.available} tone="success" icon={<PackageCheck className="h-4 w-4" />} footnote="Ready to hand out" onClick={() => setStatus('available')} />
        <Stat label="In repair" value={stats.repair} tone="danger" icon={<Wrench className="h-4 w-4" />} footnote={`${stats.expiring.length} warranties end within 60 days`} onClick={() => setStatus('repair')} />
      </div>

      {stats.expiring.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-[rgb(161_98_7)] dark:text-warning" />
          <span className="flex-1 font-semibold text-ink">Warranty ending soon: {stats.expiring.map((a) => `${a.name} (${a.code})`).join(', ')}</span>
          <Button size="sm" onClick={() => setOpen(stats.expiring[0]!.id)}>Review</Button>
        </div>
      )}

      <div className="scroll-thin mb-3 flex gap-2 overflow-x-auto pb-1">
        {[{ value: '' as const, icon: Boxes, label: 'All' }, ...CATEGORIES.map((c) => ({ ...c, label: c.value }))].map((c) => {
          const n = c.value ? assets.filter((a) => a.category === c.value).length : assets.length
          return (
            <button key={c.label} onClick={() => setCat(c.value)} aria-pressed={cat === c.value}
              className={cn('inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                cat === c.value ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink')}>
              <c.icon className="h-4 w-4" />{c.label}<span className="num text-xs opacity-70">{n}</span>
            </button>
          )
        })}
      </div>
      <Toolbar>
        <SearchInput className="w-full sm:w-80" value={q} onChange={setQ} placeholder="Search name, code, serial or person…" />
        <Select className="w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"
          options={[{ value: '', label: 'All statuses' }, { value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' }, { value: 'repair', label: 'In repair' }, { value: 'retired', label: 'Retired' }]} />
      </Toolbar>
      <DataTable rows={rows} columns={columns} rowKey={(a) => a.id} onRowClick={(a) => setOpen(a.id)} defaultSort={{ key: 'name', dir: 'asc' }}
        empty={<EmptyState icon={<Package className="h-5 w-5" />} title="No assets found" body="Try a different category or add your first asset." action={<Button variant="primary" onClick={() => setForm({})}>Add asset</Button>} />} />

      <Drawer open={!!open} onClose={() => setOpen()} title={open?.name} subtitle={open && `${open.code} · ${open.category}`}
        headerExtra={open && <StatusBadge status={open.status} />}
        footer={open && <>
          <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setForm(open)}>Edit</Button>
          {open.status === 'assigned'
            ? <Button variant="primary" icon={<ArrowLeftRight className="h-4 w-4" />} onClick={async () => { await api.assets.assign(open.id, undefined); toast.success('Returned to inventory') }}>Mark returned</Button>
            : open.status === 'available' ? <Button variant="primary" onClick={() => setAssign(open)}>Assign</Button> : null}
        </>}>
        {open && (
          <div className="flex flex-col gap-6">
            {open.assignedTo && (
              <div className="rounded-2xl bg-surface-2 p-4"><p className="label-xs mb-2">Currently with</p><Person emp={map.get(open.assignedTo)} sub={`Since ${fmtDate(open.assignedOn)}`} /></div>
            )}
            <KeyValue items={[
              ['Serial / reference', <span className="num">{open.serial}</span>], ['Category', open.category], ['Specifications', open.specs],
              ['Purchase date', fmtDate(open.purchaseDate)], ['Purchase cost', open.cost ? money(open.cost) : '—'], ['Warranty until', fmtDate(open.warrantyExpiry)],
            ]} />
            <div>
              <p className="label-xs mb-3">History</p>
              <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
                {[...open.history].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span className={cn('absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-surface', i === 0 ? 'bg-primary' : 'bg-line-strong')} />
                    <p className="text-sm font-medium">{h.text}</p><p className="text-xs text-subtle">{fmtDate(h.date)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Drawer>

      <AssetFormModal value={form} onClose={() => setForm(null)} />
      <AssignAssetModal open={!!assign} onClose={() => setAssign(null)} assetId={assign?.id} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete ${del?.name}?`} body="The asset and its history will be removed permanently. If it was lost or written off, mark it as retired instead."
        onConfirm={async () => { await api.assets.remove(del!.id); setDel(null); setOpen(); toast.success('Asset deleted') }} />
    </>
  )
}

function AssetMenu({ asset, onEdit, onDelete, onAssign }: { asset: Asset; onEdit: () => void; onDelete: () => void; onAssign: () => void }) {
  const [repair, setRepair] = useState(false)
  const [note, setNote] = useState('')
  return (
    <>
      <Menu width="w-52" trigger={(p) => <IconButton {...p} size="icon-sm" label={`More actions for ${asset.name}`} icon={<MoreHorizontal className="h-4 w-4" />} />}>
        {(close) => (
          <>
            <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { close(); onEdit() }}>Edit details</MenuItem>
            {asset.status !== 'assigned' && <MenuItem icon={<UserRound className="h-4 w-4" />} onClick={() => { close(); onAssign() }}>Assign to someone</MenuItem>}
            {asset.status !== 'repair' && <MenuItem icon={<Wrench className="h-4 w-4" />} onClick={() => { close(); setRepair(true) }}>Send for repair</MenuItem>}
            {asset.status === 'repair' && <MenuItem icon={<PackageCheck className="h-4 w-4" />} onClick={async () => { close(); await api.assets.setStatus(asset.id, 'available', 'Back from repair'); toast.success('Marked available') }}>Back from repair</MenuItem>}
            {asset.status !== 'retired' && <MenuItem icon={<Archive className="h-4 w-4" />} onClick={async () => { close(); await api.assets.setStatus(asset.id, 'retired', 'Retired from inventory'); toast.success('Asset retired') }}>Retire</MenuItem>}
            <MenuDivider />
            <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => { close(); onDelete() }}>Delete</MenuItem>
          </>
        )}
      </Menu>
      <Modal open={repair} onClose={() => setRepair(false)} size="sm" title={`Send ${asset.name} for repair`}
        footer={<><Button onClick={() => setRepair(false)}>Cancel</Button><Button variant="primary" onClick={async () => { await api.assets.setStatus(asset.id, 'repair', `Sent for repair${note ? ` — ${note}` : ''}`); setRepair(false); setNote(''); toast.success('Marked as in repair') }}>Send for repair</Button></>}>
        <Field label="What’s wrong?" hint={asset.assignedTo ? 'It will be unassigned from the current holder.' : undefined}><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Battery swelling, screen flicker" /></Field>
      </Modal>
    </>
  )
}

function AssetFormModal({ value, onClose }: { value: Partial<Asset> | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<Asset>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (value) { setF({ category: 'Laptop', purchaseDate: today(), cost: 0, ...value }); setErrors({}) } }, [value])
  const editing = !!value?.id
  const save = async () => {
    const e: Record<string, string> = {}
    if (!f.name?.trim()) e.name = 'Name is required'
    if (!f.serial?.trim()) e.serial = 'Serial or reference number is required'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    if (editing) await api.assets.update(value!.id!, f)
    else await api.assets.create({ name: f.name!, category: f.category!, serial: f.serial!, specs: f.specs ?? '', purchaseDate: f.purchaseDate!, cost: Number(f.cost) || 0, warrantyExpiry: f.warrantyExpiry || undefined, status: 'available' })
    setBusy(false)
    toast.success(editing ? 'Asset updated' : `${f.name} added to inventory`)
    onClose()
  }
  return (
    <Modal open={!!value} onClose={onClose} title={editing ? 'Edit asset' : 'Add asset'} icon={<PackagePlus className="h-5 w-5" />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{editing ? 'Save changes' : 'Add asset'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asset name" required error={errors.name} className="sm:col-span-2"><Input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. MacBook Air M2" /></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as AssetCategory })} options={CATEGORIES.map((c) => c.value)} /></Field>
        <Field label="Serial / reference no." required error={errors.serial}><Input value={f.serial ?? ''} onChange={(e) => setF({ ...f, serial: e.target.value })} /></Field>
        <Field label="Specifications" className="sm:col-span-2"><Textarea className="min-h-[72px]" value={f.specs ?? ''} onChange={(e) => setF({ ...f, specs: e.target.value })} placeholder="e.g. 16GB / 512GB, Space Grey" /></Field>
        <Field label="Purchase date"><Input type="date" value={f.purchaseDate ?? ''} onChange={(e) => setF({ ...f, purchaseDate: e.target.value })} /></Field>
        <Field label="Purchase cost (₹)"><Input type="number" min={0} value={f.cost ?? 0} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} /></Field>
        <Field label="Warranty expiry"><Input type="date" value={f.warrantyExpiry ?? ''} onChange={(e) => setF({ ...f, warrantyExpiry: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

/** Assign an asset — pick the asset (from a profile) or pick the person (from an asset). */
export function AssignAssetModal({ open, onClose, empId, assetId }: { open: boolean; onClose: () => void; empId?: string; assetId?: string }) {
  const { emps, available } = useDb((db) => ({ emps: db.employees.filter((e) => e.status !== 'inactive'), available: db.assets.filter((a) => a.status === 'available') }))
  const [pickEmp, setPickEmp] = useState('')
  const [pickAsset, setPickAsset] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setPickEmp(empId ?? ''); setPickAsset(assetId ?? ''); setNote('') } }, [open, empId, assetId])
  const asset = useDb((db) => db.assets.find((a) => a.id === (assetId ?? pickAsset)), [assetId, pickAsset])
  return (
    <Modal open={open} onClose={onClose} size="sm" title={asset && assetId ? `Assign ${asset.name}` : 'Assign an asset'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!pickEmp || !(assetId ?? pickAsset)} onClick={async () => {
        setBusy(true); await api.assets.assign((assetId ?? pickAsset)!, pickEmp, note || undefined); setBusy(false)
        toast.success(`${asset?.name} assigned to ${emps.find((e) => e.id === pickEmp)?.name}`); onClose()
      }}>Assign</Button></>}>
      <div className="grid gap-4">
        {!assetId && (
          available.length === 0 ? <p className="rounded-xl bg-surface-2 p-3 text-sm text-subtle">No assets are available right now. Add one from the Assets page first.</p> :
          <Field label="Asset"><Select value={pickAsset} onChange={(e) => setPickAsset(e.target.value)} options={[{ value: '', label: 'Choose an available asset' }, ...available.map((a) => ({ value: a.id, label: `${a.name} · ${a.code}` }))]} /></Field>
        )}
        {!empId && <Field label="Employee"><Select value={pickEmp} onChange={(e) => setPickEmp(e.target.value)} options={[{ value: '', label: 'Choose an employee' }, ...emps.map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }))]} /></Field>}
        <Field label="Handover note" hint="Condition, accessories included, etc."><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. With charger and sleeve" /></Field>
      </div>
    </Modal>
  )
}
