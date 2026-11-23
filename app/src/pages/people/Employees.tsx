import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronDown, Download, FileSpreadsheet, LayoutGrid, List, Mail, MoreHorizontal, Pencil, Phone, Send, Trash2, UserCheck, UserPlus, UserX, Users,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { profileCompletion } from '@/data/selectors'
import type { Employee } from '@/data/types'
import { downloadFile, fmtDate, toCSV } from '@/lib/utils'
import {
  Avatar, Badge, Button, ConfirmDialog, DataTable, EmptyState, IconButton, Menu, MenuDivider, MenuItem, PageHeader, Progress, SearchInput,
  Segmented, Select, StatusBadge, Toolbar, toast, type Column,
} from '@/components/ui'
import { BulkImportModal, InviteModal } from './EmployeeModals'

type StatusFilter = 'all' | Employee['status']

export default function Employees() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { employees, departments } = useDb((db) => ({ employees: db.employees, departments: db.departments }))
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>((params.get('status') as StatusFilter) ?? 'all')
  const [dept, setDept] = useState('')
  const [type, setType] = useState('')
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [selected, setSelected] = useState<string[]>([])
  const [confirm, setConfirm] = useState<{ ids: string[]; kind: 'delete' | 'deactivate' } | null>(null)
  const [busy, setBusy] = useState(false)
  const modal = params.get('modal')
  const setModal = (m?: string) => { const p = new URLSearchParams(params); if (m) p.set('modal', m); else p.delete('modal'); setParams(p, { replace: true }) }

  const counts = useMemo(() => {
    const c = { all: employees.length, active: 0, onboarding: 0, notice: 0, inactive: 0 }
    employees.forEach((e) => { c[e.status]++ })
    return c
  }, [employees])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return employees.filter((e) =>
      (status === 'all' || e.status === status) && (!dept || e.department === dept) && (!type || e.employmentType === type) &&
      (!s || `${e.name} ${e.email} ${e.code} ${e.designation} ${e.phone}`.toLowerCase().includes(s)))
  }, [employees, q, status, dept, type])

  const exportCsv = (list: Employee[]) => {
    downloadFile('employees.csv', toCSV(list.map((e) => ({
      'Employee ID': e.code, Name: e.name, Email: e.email, Phone: e.phone, Department: e.department, Designation: e.designation,
      Type: e.employmentType, 'Date of joining': e.joinDate, Status: e.status, Branch: e.branch,
    }))))
    toast.success(`Exported ${list.length} employees`)
  }

  const doConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    if (confirm.kind === 'delete') await api.employees.remove(confirm.ids)
    else await api.employees.setStatus(confirm.ids, 'inactive')
    setBusy(false)
    toast.success(confirm.kind === 'delete' ? `${confirm.ids.length} employee(s) deleted` : `${confirm.ids.length} employee(s) deactivated`, {
      action: confirm.kind === 'deactivate' ? { label: 'Undo', onClick: () => api.employees.setStatus(confirm.ids, 'active') } : undefined,
    })
    setSelected([])
    setConfirm(null)
  }

  const rowMenu = (e: Employee) => (
    <Menu align="end" width="w-48" trigger={(p) => <IconButton {...p} size="icon-sm" label={`Actions for ${e.name}`} icon={<MoreHorizontal className="h-4 w-4" />} onClickCapture={(ev) => ev.stopPropagation()} />}>
      {(close) => (
        <div onClick={(ev) => ev.stopPropagation()}>
          <MenuItem icon={<Users className="h-4 w-4" />} onClick={() => { close(); nav(`/people/${e.id}`) }}>View profile</MenuItem>
          <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { close(); nav(`/people/${e.id}/edit`) }}>Edit details</MenuItem>
          <MenuItem icon={<Mail className="h-4 w-4" />} onClick={() => { close(); nav(`/mail?to=${encodeURIComponent(e.email)}`) }}>Send email</MenuItem>
          <MenuDivider />
          {e.status === 'inactive' ? (
            <MenuItem icon={<UserCheck className="h-4 w-4" />} onClick={async () => { close(); await api.employees.setStatus([e.id], 'active'); toast.success(`${e.name} reactivated`) }}>Reactivate</MenuItem>
          ) : (
            <MenuItem icon={<UserX className="h-4 w-4" />} onClick={() => { close(); setConfirm({ ids: [e.id], kind: 'deactivate' }) }}>Deactivate</MenuItem>
          )}
          <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => { close(); setConfirm({ ids: [e.id], kind: 'delete' }) }}>Delete</MenuItem>
        </div>
      )}
    </Menu>
  )

  const columns: Column<Employee>[] = [
    {
      key: 'name', header: 'Employee', sort: (e) => e.name,
      cell: (e) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <Avatar name={e.name} hue={e.avatarHue} size={38} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{e.name}</p>
            <p className="truncate text-xs text-subtle">{e.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'code', header: 'ID', sort: (e) => e.code, cell: (e) => <span className="num font-semibold text-muted">{e.code}</span>, hideBelow: 'md' },
    {
      key: 'role', header: 'Role', sort: (e) => e.designation,
      cell: (e) => <div className="min-w-[160px]"><p className="font-medium">{e.designation}</p><p className="text-xs text-subtle">{e.department}</p></div>,
    },
    { key: 'type', header: 'Type', cell: (e) => <Badge tone={e.employmentType === 'Intern' ? 'violet' : 'neutral'}>{e.employmentType}</Badge>, hideBelow: 'lg' },
    { key: 'join', header: 'Joined', sort: (e) => e.joinDate, cell: (e) => <span className="num whitespace-nowrap text-muted">{fmtDate(e.joinDate)}</span>, hideBelow: 'lg' },
    {
      key: 'profile', header: 'Profile', sort: (e) => profileCompletion(e), hideBelow: 'xl',
      cell: (e) => {
        const p = profileCompletion(e)
        return <div className="flex w-28 items-center gap-2"><Progress value={p} size="sm" tone={p === 100 ? 'success' : p > 70 ? 'blue' : 'orange'} /><span className="num w-9 text-xs font-bold text-muted">{p}%</span></div>
      },
    },
    { key: 'status', header: 'Status', sort: (e) => e.status, cell: (e) => <StatusBadge status={e.status} /> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', cell: rowMenu },
  ]

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={`${counts.active} active · ${counts.onboarding} onboarding · ${counts.notice} on notice`}
        actions={<>
          <Button icon={<Download className="h-4 w-4" />} onClick={() => exportCsv(rows)}>Export</Button>
          <Menu width="w-72" trigger={(p) => <Button {...p} variant="primary" icon={<UserPlus className="h-4 w-4" />} iconRight={<ChevronDown className="h-4 w-4" />}>Add employee</Button>}>
            {(close) => (
              <>
                <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { close(); nav('/people/new') }}>
                  <span className="block">Add manually</span><span className="block text-xs font-normal text-subtle">Guided form, 4 short steps</span>
                </MenuItem>
                <MenuItem icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => { close(); setModal('import') }}>
                  <span className="block">Bulk import</span><span className="block text-xs font-normal text-subtle">Upload a spreadsheet, one row each</span>
                </MenuItem>
                <MenuItem icon={<Send className="h-4 w-4" />} onClick={() => { close(); setModal('invite') }}>
                  <span className="block">Invite to self-onboard</span><span className="block text-xs font-normal text-subtle">They fill in their own details</span>
                </MenuItem>
              </>
            )}
          </Menu>
        </>}
      />

      <Toolbar actions={
        <Segmented size="sm" value={view} onChange={setView} options={[
          { value: 'table', label: <><List className="h-3.5 w-3.5" /><span className="sr-only">Table view</span></> },
          { value: 'grid', label: <><LayoutGrid className="h-3.5 w-3.5" /><span className="sr-only">Card view</span></> },
        ]} />
      }>
        <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search name, email, ID, phone…" />
        <Select className="w-full sm:w-48" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department"
          options={[{ value: '', label: 'All departments' }, ...departments.map((d) => d.name)]} />
        <Select className="w-full sm:w-40" value={type} onChange={(e) => setType(e.target.value)} aria-label="Employment type"
          options={[{ value: '', label: 'All types' }, 'Full Time', 'Part Time', 'Intern', 'Contract']} />
      </Toolbar>

      <Segmented className="mb-3 max-w-full overflow-x-auto" value={status} onChange={(v) => { setStatus(v); setSelected([]) }} options={[
        { value: 'all', label: 'All', count: counts.all }, { value: 'active', label: 'Active', count: counts.active },
        { value: 'onboarding', label: 'Onboarding', count: counts.onboarding }, { value: 'notice', label: 'On notice', count: counts.notice },
        { value: 'inactive', label: 'Inactive', count: counts.inactive },
      ]} />

      {view === 'table' ? (
        <DataTable rows={rows} columns={columns} rowKey={(e) => e.id} onRowClick={(e) => nav(`/people/${e.id}`)}
          selectable selected={selected} onSelectedChange={setSelected} defaultSort={{ key: 'name', dir: 'asc' }}
          bulkActions={<>
            <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exportCsv(employees.filter((e) => selected.includes(e.id)))}>Export</Button>
            <Button size="sm" icon={<UserX className="h-3.5 w-3.5" />} onClick={() => setConfirm({ ids: selected, kind: 'deactivate' })}>Deactivate</Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirm({ ids: selected, kind: 'delete' })}>Delete</Button>
          </>}
          empty={<EmptyState icon={<Users className="h-5 w-5" />} title="No employees match" body="Try a different search or clear the filters."
            action={<Button onClick={() => { setQ(''); setDept(''); setType(''); setStatus('all') }}>Clear filters</Button>} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((e) => (
            <div key={e.id} role="link" tabIndex={0} onClick={() => nav(`/people/${e.id}`)} onKeyDown={(ev) => ev.key === 'Enter' && nav(`/people/${e.id}`)}
              className="card group cursor-pointer p-5 transition-shadow hover:shadow-pop">
              <div className="flex items-start justify-between">
                <Avatar name={e.name} hue={e.avatarHue} size={52} />
                <StatusBadge status={e.status} />
              </div>
              <p className="mt-3 truncate text-[15px] font-bold">{e.name}</p>
              <p className="truncate text-sm text-muted">{e.designation}</p>
              <p className="mt-0.5 text-xs text-subtle">{e.department} · {e.code}</p>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-[13px] text-muted">
                <span className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0 text-subtle" />{e.email}</span>
                <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-subtle" />{e.phone}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="card col-span-full"><EmptyState title="No employees match" /></div>}
        </div>
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doConfirm} loading={busy}
        title={confirm?.kind === 'delete' ? `Delete ${confirm.ids.length > 1 ? `${confirm.ids.length} employees` : 'employee'}?` : `Deactivate ${confirm && confirm.ids.length > 1 ? `${confirm.ids.length} employees` : 'employee'}?`}
        confirmLabel={confirm?.kind === 'delete' ? 'Delete permanently' : 'Deactivate'} tone={confirm?.kind === 'delete' ? 'danger' : 'primary'}
        body={confirm?.kind === 'delete'
          ? 'This removes their profile, salary structure and history. Assigned assets go back to inventory. This can’t be undone — consider deactivating instead.'
          : 'They will lose access to the employee app immediately. Their records stay intact and you can reactivate any time.'} />
      <BulkImportModal open={modal === 'import'} onClose={() => setModal()} />
      <InviteModal open={modal === 'invite'} onClose={() => setModal()} />
    </>
  )
}
