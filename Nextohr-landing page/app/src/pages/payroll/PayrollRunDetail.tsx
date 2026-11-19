import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle2, Download, FileText, Send } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { empMap } from '@/data/selectors'
import type { PayrollLine } from '@/data/types'
import { runTotals } from '@/lib/payroll'
import { downloadFile, fmtDate, money, toCSV } from '@/lib/utils'
import logo from '@/assets/logo.jpg'
import { Button, DataTable, Drawer, EmptyState, IconButton, Person, SearchInput, StatusBadge, Toolbar, toast } from '@/components/ui'

export default function PayrollRunDetail() {
  const { id } = useParams()
  const { run, map, company, salaries, statutory } = useDb((db) => ({ run: db.payrollRuns.find((r) => r.id === id), map: empMap(db), company: db.company, salaries: db.salaries, statutory: db.statutory }), [id])
  const [q, setQ] = useState('')
  const [slip, setSlip] = useState<PayrollLine | null>(null)
  if (!run) return <EmptyState title="Pay run not found" action={<Link to="/payroll"><Button>Back to payroll</Button></Link>} />
  const t = runTotals(run.lines)
  const rows = run.lines.filter((l) => !q || map.get(l.empId)?.name.toLowerCase().includes(q.toLowerCase()))

  const bankFile = () => {
    downloadFile(`bank-transfer-${run.label.replace(/\s/g, '-')}.csv`, toCSV(run.lines.map((l) => { const e = map.get(l.empId)!; return { 'Beneficiary name': e.bank.holder || e.name, 'Account number': e.bank.account, IFSC: e.bank.ifsc, Amount: l.net, Narration: `Salary ${run.label}` } })))
    toast.success('Bank transfer file downloaded')
  }

  return (
    <div>
      <Link to="/payroll" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink"><ArrowLeft className="h-4 w-4" /> Payroll</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-[26px] font-extrabold tracking-tight">{run.label} payroll</h1><StatusBadge status={run.status} /></div>
          <p className="mt-1 text-sm text-subtle">{fmtDate(run.from)} – {fmtDate(run.to)} · processed {fmtDate(run.createdAt)}{run.paidOn && ` · paid ${fmtDate(run.paidOn)}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Banknote className="h-4 w-4" />} onClick={bankFile}>Bank transfer file</Button>
          <Button icon={<Send className="h-4 w-4" />} onClick={() => toast.success(`Payslips emailed to ${run.lines.length} employees`)}>Email payslips</Button>
          {run.status === 'processed' && <Button variant="primary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={async () => { await api.payroll.markPaid(run.id); toast.success('Marked as paid') }}>Mark as paid</Button>}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[['Employees', String(run.lines.length)], ['Gross', money(t.gross)], ['Loss of pay', money(t.lwp)], ['Deductions', money(t.deductions)], ['Net payout', money(t.net)]].map(([k, v], i) => (
          <div key={k} className={i === 4 ? 'card bg-primary-soft p-4' : 'card p-4'}><p className="text-xs font-semibold text-subtle">{k}</p><p className={i === 4 ? 'num mt-1 text-xl font-extrabold text-primary-ink' : 'num mt-1 text-xl font-extrabold'}>{v}</p></div>
        ))}
      </div>
      <Toolbar><SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search employee…" /></Toolbar>
      <DataTable rows={rows} rowKey={(l) => l.empId} onRowClick={setSlip} columns={[
        { key: 'emp', header: 'Employee', sort: (l) => map.get(l.empId)?.name ?? '', cell: (l) => <Person emp={map.get(l.empId)} size={32} /> },
        { key: 'gross', header: 'Gross', align: 'right', sort: (l) => l.gross, cell: (l) => <span className="num">{money(l.gross)}</span> },
        { key: 'lwp', header: 'LWP', align: 'right', hideBelow: 'md', cell: (l) => l.lwpDays ? <span className="num text-danger">{l.lwpDays}d · −{money(l.lwpDeduction)}</span> : <span className="text-subtle">—</span> },
        { key: 'stat', header: 'PF / ESI / PT', align: 'right', hideBelow: 'lg', cell: (l) => <span className="num text-muted">{money(l.pf + l.esi + l.pt)}</span> },
        { key: 'tds', header: 'TDS', align: 'right', hideBelow: 'lg', cell: (l) => <span className="num text-muted">{l.tds ? money(l.tds) : '—'}</span> },
        { key: 'net', header: 'Net pay', align: 'right', sort: (l) => l.net, cell: (l) => <span className="num font-bold">{money(l.net)}</span> },
        { key: 'act', header: <span className="sr-only">Payslip</span>, align: 'right', cell: (l) => <IconButton size="icon-sm" label="View payslip" icon={<FileText className="h-4 w-4" />} onClick={(e) => { e.stopPropagation(); setSlip(l) }} /> },
      ]} />

      <Drawer open={!!slip} onClose={() => setSlip(null)} width="max-w-2xl" title="Payslip" subtitle={slip && `${map.get(slip.empId)?.name} · ${run.label}`}
        footer={<Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>Download PDF</Button>}>
        {slip && (() => {
          const e = map.get(slip.empId)!
          const s = salaries.find((x) => x.empId === slip.empId)
          const ratio = s ? slip.gross / Math.max(1, s.basic + s.hra + s.special) : 1
          return (
            <div id="payslip" className="rounded-2xl bg-white p-6 text-[13px] text-[#1f2937] ring-1 ring-black/5">
              <style>{`@media print { body * { visibility: hidden } #payslip, #payslip * { visibility: visible } #payslip { position: absolute; inset: 0 auto auto 0; width: 100% } }`}</style>
              <div className="flex items-start justify-between border-b-2 border-[#F68713] pb-3">
                <img src={logo} alt="SurfSync Infotech" className="h-10 w-auto" />
                <div className="text-right"><p className="font-bold">{company.legalName}</p><p className="text-[11px] text-gray-500">{company.address.line1}, {company.address.city}</p></div>
              </div>
              <p className="mt-4 text-center text-sm font-extrabold tracking-wide text-[#1D667C]">PAYSLIP FOR {run.label.toUpperCase()}</p>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
                {[['Employee', e.name], ['Employee ID', e.code], ['Designation', e.designation], ['Department', e.department], ['Bank', `${e.bank.bankName} ····${e.bank.account.slice(-4)}`], ['Working days', `${slip.workingDays} (LWP ${slip.lwpDays})`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-gray-100 py-1"><span className="text-gray-500">{k}</span><span className="font-semibold">{v}</span></div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-1 font-bold">Earnings</p>
                  {[['Basic', (s?.basic ?? 0) * ratio], ['HRA', (s?.hra ?? 0) * ratio], ['Special allowance', (s?.special ?? 0) * ratio]].map(([k, v]) => <div key={k as string} className="flex justify-between border-b border-gray-100 py-1"><span>{k}</span><span className="tabular-nums">{money(v as number)}</span></div>)}
                  <div className="flex justify-between py-1.5 font-bold"><span>Gross</span><span className="tabular-nums">{money(slip.gross)}</span></div>
                </div>
                <div>
                  <p className="mb-1 font-bold">Deductions</p>
                  {[['Loss of pay', slip.lwpDeduction], ['Provident fund', slip.pf], ['ESI', slip.esi], ['Professional tax', slip.pt], ['TDS', slip.tds], ['Other', slip.other]].map(([k, v]) => <div key={k as string} className="flex justify-between border-b border-gray-100 py-1"><span>{k}</span><span className="tabular-nums">{money(v as number)}</span></div>)}
                  <div className="flex justify-between py-1.5 font-bold"><span>Total</span><span className="tabular-nums">{money(slip.gross - slip.net)}</span></div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#FFF6EC] px-4 py-3"><span className="font-bold">Net pay</span><span className="text-lg font-extrabold tabular-nums text-[#B65807]">{money(slip.net)}</span></div>
              {statutory.showEmployerOnPayslip && slip.pf > 0 && <p className="mt-3 text-[11px] text-gray-500">Employer contribution: PF {money(slip.pf)} (not deducted from your pay).</p>}
              <p className="mt-4 text-center text-[10px] text-gray-400">This is a system-generated payslip and does not require a signature.</p>
            </div>
          )
        })()}
      </Drawer>
    </div>
  )
}
