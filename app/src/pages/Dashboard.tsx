import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlarmClock, ArrowRight, CakeSlice, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileSignature, Gift, Lightbulb,
  PartyPopper, Sparkles, TrendingDown, TrendingUp, UserCheck, UserMinus, Users, Wallet,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { activeEmployees, attendanceTrend, daySummary, empMap, lastWorkingDay, pendingCounts, upcomingBirthdays, workAnniversaries } from '@/data/selectors'
import { addDays, cn, compactMoney, fmtDate, fmtDay, fmtShort, greeting, isSunday, parseISO, plural, relTime, sum, today, toMins } from '@/lib/utils'
import { runTotals } from '@/lib/payroll'
import { Avatar, AvatarStack, Badge, Button, Card, Segmented, Stat } from '@/components/ui'
import { axisProps, C, ChartTooltip, Legend } from '@/components/charts'

type Period = '7' | '14' | '30'

export default function Dashboard() {
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('14')
  const T = today()
  const data = useDb((db) => {
    const days = Number(period)
    const span = (from: string, to: string) => attendanceTrend(db, from, to)
    const trend = span(addDays(T, -days * 1.4), T).slice(-days)
    const prev = span(addDays(T, -days * 2.8), addDays(T, -days * 1.4 - 1)).slice(-days)
    const avg = (a: typeof trend) => (a.length ? sum(a.map((x) => x.rate)) / a.length : 0)
    const lateSum = (a: typeof trend) => sum(a.map((x) => x.late))
    const from = trend[0]?.date ?? T
    const recs = db.attendance.filter((a) => a.date >= from && a.checkIn && a.checkOut)
    const avgHours = recs.length ? sum(recs.map((a) => toMins(a.checkOut!) - toMins(a.checkIn!) - 60)) / recs.length / 60 : 0
    const active = activeEmployees(db)
    const joined = db.employees.filter((e) => e.joinDate >= addDays(T, -90) && e.joinDate <= T).length
    const deptRate = Array.from(new Set(active.map((e) => e.department))).map((dep) => {
      const ids = new Set(active.filter((e) => e.department === dep).map((e) => e.id))
      const rs = db.attendance.filter((a) => ids.has(a.empId) && a.date >= from && !['weekend', 'holiday', 'leave'].includes(a.status))
      const p = rs.filter((a) => ['present', 'late', 'half-day'].includes(a.status)).length
      return { dep, rate: rs.length ? (p / rs.length) * 100 : 0, headcount: ids.size }
    }).sort((a, b) => b.rate - a.rate)
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
      const ds = trend.filter((t) => parseISO(t.date).getDay() === i + 1)
      return { day: d, rate: ds.length ? avg(ds) : 0 }
    })
    const absentees = active.map((e) => {
      const rs = db.attendance.filter((a) => a.empId === e.id && a.date >= addDays(T, -30))
      return { emp: e, absent: rs.filter((a) => a.status === 'absent').length, late: rs.filter((a) => a.status === 'late').length }
    }).filter((x) => x.absent + x.late > 0).sort((a, b) => b.absent * 3 + b.late - (a.absent * 3 + a.late)).slice(0, 5)

    // next 7 working days forecast
    const forecast: { date: string; expected: number; leave: number }[] = []
    for (let d = addDays(T, 1); forecast.length < 7; d = addDays(d, 1)) {
      if (isSunday(d)) continue
      const hol = db.holidays.find((h) => h.date === d && h.type !== 'Optional')
      const onLeave = db.leaves.filter((l) => ['approved', 'pending'].includes(l.status) && d >= l.from && d <= l.to).length
      forecast.push({ date: d, expected: hol ? 0 : active.length - onLeave, leave: hol ? active.length : onLeave })
    }
    const LD = lastWorkingDay(db, T)
    const outToday = db.leaves.filter((l) => l.status === 'approved' && LD >= l.from && LD <= l.to)
    const outWeek = db.leaves.filter((l) => l.status === 'approved' && l.from > T && l.from <= addDays(T, 7))
    const lastRun = db.payrollRuns[0]
    return {
      trend, liveDay: lastWorkingDay(db, T), today: daySummary(db, lastWorkingDay(db, T)), rate: avg(trend), prevRate: avg(prev), late: lateSum(trend), prevLate: lateSum(prev),
      avgHours, headcount: active.length, joined, exits: db.employees.filter((e) => e.status === 'notice' || e.status === 'inactive').length,
      pending: pendingCounts(db), deptRate, weekday, absentees, forecast, outToday, outWeek, map: empMap(db),
      leavesTaken: db.leaves.filter((l) => l.status === 'approved' && l.from >= from && l.from <= T).reduce((n, l) => n + l.days, 0),
      birthdays: upcomingBirthdays(db, 21), anniversaries: workAnniversaries(db, 30), activity: db.activity.slice(0, 6),
      lastRun: lastRun ? { ...runTotals(lastRun.lines), label: lastRun.label, people: lastRun.lines.length } : undefined,
      offersOut: db.offers.filter((o) => o.status === 'sent').length,
      onboarding: db.employees.filter((e) => e.status === 'onboarding'),
      oldestLeave: db.leaves.filter((l) => l.status === 'pending').sort((a, b) => a.appliedOn.localeCompare(b.appliedOn))[0],
      noCheckout: db.attendance.filter((a) => a.date < T && a.date >= addDays(T, -14) && a.checkIn && !a.checkOut).length,
      setup: db.setupDone.length,
      companyName: db.company.name,
    }
  }, [period])

  const rateDelta = data.rate - data.prevRate
  const insights = useMemo(() => {
    const out: { tone: 'good' | 'warn' | 'info'; text: string }[] = []
    out.push({ tone: rateDelta >= 0 ? 'good' : 'warn', text: `Attendance averaged ${data.rate.toFixed(1)}% — ${rateDelta >= 0 ? 'up' : 'down'} ${Math.abs(rateDelta).toFixed(1)} pts on the previous ${period} days.` })
    const worst = [...data.weekday].filter((w) => w.rate > 0).sort((a, b) => a.rate - b.rate)[0]
    if (worst) out.push({ tone: 'warn', text: `${worst.day}s are the weak spot at ${worst.rate.toFixed(0)}% attendance.` })
    const lowDept = data.deptRate[data.deptRate.length - 1]
    if (lowDept) out.push({ tone: 'info', text: `${lowDept.dep} has the lowest attendance (${lowDept.rate.toFixed(0)}%) across ${plural(lowDept.headcount, 'person', 'people')}.` })
    out.push({ tone: data.late > data.prevLate ? 'warn' : 'good', text: `${data.late} late check-ins vs ${data.prevLate} in the previous period.` })
    return out
  }, [data, rateDelta, period])

  const actions = [
    data.pending.leaves > 0 && { icon: CalendarClock, tone: 'high', title: `Review ${plural(data.pending.leaves, 'leave request')}`, body: data.oldestLeave ? `Oldest is waiting since ${fmtShort(data.oldestLeave.appliedOn)}. Quick decisions help teams plan cover.` : '', to: '/approvals?tab=leave' },
    data.pending.reports > 0 && { icon: ClipboardList, tone: 'med', title: `Approve ${plural(data.pending.reports, 'work report')}`, body: 'Bulk-approve the routine ones in one click from Approvals.', to: '/approvals?tab=reports' },
    data.noCheckout > 0 && { icon: AlarmClock, tone: 'med', title: `${plural(data.noCheckout, 'day')} missing a check-out`, body: 'Worked hours can’t be calculated. Regularise or remind staff.', to: '/attendance?filter=no-checkout' },
    data.pending.offers > 0 && { icon: FileSignature, tone: 'low', title: `${plural(data.pending.offers, 'offer letter')} still in draft`, body: 'Finish and send so candidates can accept.', to: '/onboarding' },
    data.onboarding.length > 0 && { icon: UserCheck, tone: 'low', title: `Prepare onboarding for ${data.onboarding[0]!.name}`, body: `Joins ${fmtDate(data.onboarding[0]!.joinDate)} — assign a laptop and share credentials.`, to: `/people/${data.onboarding[0]!.id}` },
  ].filter(Boolean) as { icon: typeof CalendarClock; tone: 'high' | 'med' | 'low'; title: string; body: string; to: string }[]

  const donut = [
    { name: 'Present', value: data.today.present - data.today.late, fill: C.blue },
    { name: 'Late', value: data.today.late, fill: C.orange },
    { name: 'On leave', value: data.today.leave, fill: '#A78BFA' },
    { name: 'Not in yet', value: data.today.notIn + data.today.absent, fill: 'rgb(var(--line-strong))' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-subtle">{fmtDay(T)}, {fmtDate(T)}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">{greeting()}, HR team <span aria-hidden>👋</span></h1>
          <p className="mt-1 text-sm text-subtle">{data.liveDay === T ? <>Here’s how {data.companyName} is doing — {data.today.present} of {data.today.total} people are in today.</> : <>It’s a weekly off today. {data.today.present} of {data.today.total} people came in on {fmtDay(data.liveDay)}, {fmtShort(data.liveDay)}.</>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-subtle">Analytics for last</span>
          <Segmented value={period} onChange={setPeriod} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Headcount" value={data.headcount} icon={<Users className="h-4 w-4" />} tone="orange"
          footnote={`${data.joined} joined in 90 days · ${data.exits} exiting/left`} onClick={() => nav('/people')} />
        <Stat label="Attendance rate" value={`${data.rate.toFixed(1)}%`} icon={<UserCheck className="h-4 w-4" />} tone="blue"
          delta={rateDelta} deltaLabel=" pts" footnote={`vs previous ${period} days`} onClick={() => nav('/attendance')} />
        <Stat label="Avg. hours / day" value={`${data.avgHours.toFixed(1)}h`} icon={<Clock3 className="h-4 w-4" />} tone="success"
          footnote={`${data.late} late check-ins · ${data.leavesTaken} leave days`} />
        <Stat label="Waiting on you" value={data.pending.total} icon={<CheckCircle2 className="h-4 w-4" />} tone="violet"
          footnote={`${data.pending.leaves} leave · ${data.pending.reports} reports · ${data.pending.offers} drafts`} onClick={() => nav('/approvals')} />
      </div>

      {/* trend + today */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Attendance trend" subtitle={`Daily attendance rate and late check-ins over the last ${period} working days`}
          action={<Legend items={[{ label: 'Attendance %', color: C.blue }, { label: 'Late', color: C.orange }]} />}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <ComposedChart data={data.trend} margin={{ left: -18, right: 4, top: 8 }}>
                <defs>
                  <linearGradient id="rate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtShort(d)} minTickGap={18} />
                <YAxis yAxisId="r" {...axisProps} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="l" orientation="right" {...axisProps} hide domain={[0, (max: number) => Math.max(4, max * 3)]} />
                <Tooltip content={<ChartTooltip labelFormat={(l) => `${fmtDay(l)}, ${fmtDate(l)}`} format={(v, n) => (n === 'Attendance' ? `${v.toFixed(1)}%` : v)} />} cursor={{ stroke: C.grid }} />
                <Bar yAxisId="l" dataKey="late" name="Late" fill={C.orange} radius={[4, 4, 0, 0]} barSize={10} opacity={0.85} />
                <Area yAxisId="r" type="monotone" dataKey="rate" name="Attendance" stroke={C.blue} strokeWidth={2.5} fill="url(#rate)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={data.liveDay === T ? 'Today, live' : 'Last working day'} subtitle={data.liveDay === T ? 'Updates as people check in' : `${fmtDay(data.liveDay)}, ${fmtDate(data.liveDay)} · today is a weekly off`} action={<Link to="/attendance" className="text-[13px] font-bold text-accent-ink hover:underline">Open board</Link>}>
          <div className="flex items-center gap-4">
            <div className="relative h-[150px] w-[150px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={52} outerRadius={70} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                    {donut.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-2xl font-extrabold">{data.today.rate.toFixed(0)}%</span>
                <span className="text-[11px] font-semibold text-subtle">present</span>
              </div>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5">
              {donut.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  <span className="flex-1 text-muted">{d.name}</span>
                  <span className="num font-bold">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-xl bg-surface-2 p-3">
            <p className="label-xs mb-2">{data.liveDay === T ? 'Out today' : 'Was out'}</p>
            {data.outToday.length === 0 ? <p className="text-sm text-subtle">Everyone’s expected in.</p> : (
              <div className="flex items-center gap-3">
                <AvatarStack people={data.outToday.map((l) => data.map.get(l.empId)!).filter(Boolean)} />
                <span className="text-[13px] text-muted">{data.outToday.map((l) => data.map.get(l.empId)?.name.split(' ')[0]).join(', ')}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* attention + insights */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Needs your attention" subtitle="Prioritised next steps — most urgent first" icon={<Sparkles className="h-4 w-4 text-primary-ink" />}>
          {actions.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">All caught up. Nice work!</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {actions.map((a) => (
                <li key={a.title}>
                  <Link to={a.to} className="group flex items-start gap-3.5 rounded-xl px-2 py-3 hover:bg-surface-2">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      a.tone === 'high' ? 'bg-danger-soft text-danger' : a.tone === 'med' ? 'bg-primary-soft text-primary-ink' : 'bg-accent-soft text-accent-ink')}>
                      <a.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">{a.title}</span>
                        <Badge tone={a.tone === 'high' ? 'danger' : a.tone === 'med' ? 'orange' : 'blue'}>{a.tone === 'high' ? 'High' : a.tone === 'med' ? 'Medium' : 'Low'}</Badge>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-subtle">{a.body}</span>
                    </span>
                    <ArrowRight className="mt-2.5 h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="What’s driving it" subtitle="Plain-language read of the numbers" icon={<Lightbulb className="h-4 w-4" />}>
          <ul className="flex flex-col gap-3">
            {insights.map((i) => (
              <li key={i.text} className="flex gap-3">
                <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  i.tone === 'good' ? 'bg-success-soft text-success' : i.tone === 'warn' ? 'bg-primary-soft text-primary-ink' : 'bg-accent-soft text-accent-ink')}>
                  {i.tone === 'good' ? <TrendingUp className="h-3.5 w-3.5" /> : i.tone === 'warn' ? <TrendingDown className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                </span>
                <span className="text-sm leading-relaxed text-muted">{i.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Attendance by department" subtitle={`Last ${period} working days`}>
          <ul className="flex flex-col gap-3">
            {data.deptRate.map((d) => (
              <li key={d.dep}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink">{d.dep}</span>
                  <span className="num font-bold text-muted">{d.rate.toFixed(0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full" style={{ width: `${d.rate}%`, background: d.rate < 85 ? C.orange : C.blue }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Next 7 working days" subtitle="Expected in vs. on approved/pending leave"
          action={<Legend items={[{ label: 'In', color: C.blue }, { label: 'Leave/holiday', color: C.orangeSoft }]} />}>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={data.forecast} margin={{ left: -24, right: 0, top: 8 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => `${fmtDay(d)} ${parseISO(d).getDate()}`} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip labelFormat={(l) => fmtDate(l)} />} cursor={{ fill: 'rgb(var(--surface-3))' }} />
                <Bar dataKey="expected" name="Expected in" stackId="a" fill={C.blue} radius={[0, 0, 4, 4]} barSize={22} />
                <Bar dataKey="leave" name="Leave / holiday" stackId="a" fill={C.orangeSoft} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="People to check in with" subtitle="Absences and late marks, last 30 days" className="lg:col-span-2 xl:col-span-1">
          {data.absentees.length === 0 ? <p className="text-sm text-subtle">No repeated absences. 🎉</p> : (
            <ul className="flex flex-col divide-y divide-line">
              {data.absentees.map(({ emp, absent, late }) => (
                <li key={emp.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <Avatar name={emp.name} hue={emp.avatarHue} size={34} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/people/${emp.id}`} className="block truncate text-sm font-semibold hover:underline">{emp.name}</Link>
                    <span className="block truncate text-xs text-subtle">{emp.department}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {absent > 0 && <Badge tone="danger">{absent} absent</Badge>}
                    {late > 0 && <Badge tone="warning">{late} late</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Celebrations" subtitle="Birthdays and work anniversaries ahead" icon={<PartyPopper className="h-4 w-4" />}>
          <ul className="flex flex-col gap-3">
            {[...data.birthdays.map((b) => ({ ...b, kind: 'bday' as const })), ...data.anniversaries.map((a) => ({ ...a, kind: 'anniv' as const }))]
              .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map((c) => (
                <li key={c.kind + c.emp.id} className="flex items-center gap-3">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', c.kind === 'bday' ? 'bg-primary-soft text-primary-ink' : 'bg-accent-soft text-accent-ink')}>
                    {c.kind === 'bday' ? <CakeSlice className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.emp.name}</p>
                    <p className="text-xs text-subtle">{c.kind === 'bday' ? 'Birthday' : `${'years' in c ? c.years : ''} year work anniversary`}</p>
                  </div>
                  <span className={cn('text-xs font-bold', c.date === T ? 'text-primary-ink' : 'text-muted')}>{c.date === T ? 'Today' : fmtShort(c.date)}</span>
                </li>
              ))}
            {data.birthdays.length + data.anniversaries.length === 0 && <p className="text-sm text-subtle">Nothing coming up.</p>}
          </ul>
        </Card>

        <Card title="Payroll snapshot" icon={<Wallet className="h-4 w-4" />} action={<Link to="/payroll" className="text-[13px] font-bold text-accent-ink hover:underline">Payroll</Link>}>
          {data.lastRun ? (
            <>
              <p className="text-xs font-semibold text-subtle">Last run · {data.lastRun.label}</p>
              <p className="num mt-1 text-[28px] font-extrabold tracking-tight">{compactMoney(data.lastRun.net)}</p>
              <p className="text-xs text-subtle">net paid to {data.lastRun.people} people</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[['Gross', data.lastRun.gross], ['Deductions', data.lastRun.deductions], ['PF', data.lastRun.pf]].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-surface-2 px-2 py-2.5">
                    <p className="text-[11px] font-semibold text-subtle">{k}</p>
                    <p className="num text-sm font-bold">{compactMoney(v as number)}</p>
                  </div>
                ))}
              </div>
              <Button variant="primary" className="mt-4 w-full" onClick={() => nav('/payroll/run')} icon={<Wallet className="h-4 w-4" />}>Run this month’s payroll</Button>
            </>
          ) : <p className="text-sm text-subtle">No payroll runs yet.</p>}
        </Card>

        <Card title="Recent activity" icon={<CalendarDays className="h-4 w-4" />}>
          <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
            {data.activity.map((a) => (
              <li key={a.id} className="relative flex gap-3">
                <span className="z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
                  {a.actor === 'You' ? <Sparkles className="h-3.5 w-3.5 text-primary-ink" /> : <UserMinus className="h-3.5 w-3.5 text-accent-ink" />}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-[13px] leading-snug text-muted"><b className="font-semibold text-ink">{a.actor}</b> {a.text}</p>
                  <p className="mt-0.5 text-xs text-subtle">{relTime(a.date)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
