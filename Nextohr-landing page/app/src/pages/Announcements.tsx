import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, CakeSlice, CalendarDays, Clock, Eye, MapPin, Megaphone, MoreHorizontal, Pencil, Pin, PinOff, Plus, Siren, Sparkles, Trash2, Users } from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { upcomingBirthdays } from '@/data/selectors'
import type { Announcement, AnnouncementKind } from '@/data/types'
import { addDays, cn, fmtDate, fmtShort, fmtTime, monthName, parseISO, today } from '@/lib/utils'
import {
  Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, IconButton, Input, Menu, MenuDivider, MenuItem, Modal, PageHeader,
  Segmented, Select, StatusBadge, Switch, Tabs, Textarea, toast,
} from '@/components/ui'

const KINDS: { value: AnnouncementKind; label: string; icon: typeof Megaphone; tone: string }[] = [
  { value: 'notice', label: 'Notice', icon: Megaphone, tone: 'bg-accent-soft text-accent-ink' },
  { value: 'event', label: 'Event', icon: CalendarDays, tone: 'bg-primary-soft text-primary-ink' },
  { value: 'alert', label: 'Alert', icon: Siren, tone: 'bg-danger-soft text-danger' },
  { value: 'birthday', label: 'Birthday', icon: CakeSlice, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
]
const kindMeta = (k: AnnouncementKind) => KINDS.find((x) => x.value === k)!

export default function Announcements() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'all' | AnnouncementKind>('all')
  const [compose, setCompose] = useState<Partial<Announcement> | null>(null)
  const [del, setDel] = useState<Announcement | null>(null)
  const { list, birthdays, departments } = useDb((db) => ({ list: db.announcements, birthdays: upcomingBirthdays(db, 30), departments: db.departments.map((d) => d.name) }))
  const [autoBday, setAutoBday] = useState(true)

  useEffect(() => {
    const c = params.get('compose') as AnnouncementKind | null
    if (c) { setCompose({ kind: c }); params.delete('compose'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const shown = useMemo(() => list.filter((a) => tab === 'all' || a.kind === tab).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)), [list, tab])
  const events = list.filter((a) => a.kind === 'event' && a.eventDate && a.eventDate >= today()).sort((a, b) => a.eventDate!.localeCompare(b.eventDate!))
  const todays = birthdays.filter((b) => b.date === today())

  return (
    <>
      <PageHeader title="Announcements" subtitle="Notices, events, alerts and birthday wishes — pushed to everyone’s phone."
        actions={<Menu width="w-56" trigger={(p) => <Button {...p} variant="primary" icon={<Plus className="h-4 w-4" />}>New post</Button>}>
          {(close) => KINDS.map((k) => <MenuItem key={k.value} icon={<k.icon className="h-4 w-4" />} onClick={() => { close(); setCompose({ kind: k.value }) }}>{k.label}</MenuItem>)}
        </Menu>}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'all', label: 'All posts', count: list.length }, ...KINDS.map((k) => ({ value: k.value, label: `${k.label}s`, count: list.filter((a) => a.kind === k.value).length })),
        ]} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3">
          {shown.length === 0 && <div className="card"><EmptyState icon={<Megaphone className="h-5 w-5" />} title="Nothing posted yet" body="Share your first update with the team." action={<Button variant="primary" onClick={() => setCompose({ kind: tab === 'all' ? 'notice' : tab })}>Create post</Button>} /></div>}
          {shown.map((a) => {
            const m = kindMeta(a.kind)
            return (
              <article key={a.id} className={cn('card p-5', a.pinned && 'ring-1 ring-primary/40')}>
                <div className="flex items-start gap-4">
                  {a.kind === 'event' && a.eventDate ? (
                    <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-line text-center">
                      <span className="w-full bg-primary py-0.5 text-[10px] font-bold uppercase text-on-primary">{monthName(parseISO(a.eventDate).getMonth())}</span>
                      <span className="num py-1 text-xl font-extrabold">{parseISO(a.eventDate).getDate()}</span>
                    </div>
                  ) : <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', m.tone)}><m.icon className="h-5 w-5" /></span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold">{a.title}</h3>
                      {a.pinned && <Badge tone="orange"><Pin className="h-3 w-3" />Pinned</Badge>}
                      {a.status !== 'published' && <StatusBadge status={a.status} />}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{a.body}</p>
                    {a.kind === 'event' && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-ink">
                        {a.eventDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-subtle" />{fmtDate(a.eventDate)}{a.eventTime && `, ${fmtTime(a.eventTime)}`}</span>}
                        {a.venue && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-subtle" />{a.venue}</span>}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{a.audience}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{a.status === 'scheduled' && a.publishAt ? `Goes out ${fmtDate(a.publishAt)}` : `Posted ${fmtShort(a.createdAt)}`}</span>
                      {a.status === 'published' && <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.reads} read</span>}
                      {a.expiresAt && <span>Expires {fmtShort(a.expiresAt)}</span>}
                    </div>
                  </div>
                  <Menu width="w-44" trigger={(p) => <IconButton {...p} size="icon-sm" label={`Actions for ${a.title}`} icon={<MoreHorizontal className="h-4 w-4" />} />}>
                    {(close) => (
                      <>
                        <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { close(); setCompose(a) }}>Edit</MenuItem>
                        <MenuItem icon={a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} onClick={async () => { close(); await api.announcements.update(a.id, { pinned: !a.pinned }); toast.success(a.pinned ? 'Unpinned' : 'Pinned to top') }}>{a.pinned ? 'Unpin' : 'Pin to top'}</MenuItem>
                        {a.status === 'published' && <MenuItem icon={<Bell className="h-4 w-4" />} onClick={() => { close(); toast.success('Push reminder sent') }}>Re-send push</MenuItem>}
                        <MenuDivider />
                        <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => { close(); setDel(a) }}>Delete</MenuItem>
                      </>
                    )}
                  </Menu>
                </div>
              </article>
            )
          })}
        </div>

        <aside className="flex flex-col gap-4">
          <Card title="Birthdays" icon={<CakeSlice className="h-4 w-4" />}>
            <Switch checked={autoBday} onChange={(v) => { setAutoBday(v); toast.success(v ? 'Birthday wishes will post automatically at 9 AM' : 'Automatic wishes turned off') }} label="Auto-post wishes" description="Publishes to everyone at 9:00 AM on the day." />
            <div className="mt-4 flex flex-col gap-3">
              {todays.length > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-primary-soft to-accent-soft p-3">
                  <p className="text-xs font-bold text-primary-ink">Today 🎂</p>
                  {todays.map((b) => <p key={b.emp.id} className="text-sm font-bold">{b.emp.name}</p>)}
                  <Button size="sm" variant="primary" className="mt-2" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={async () => { const n = await api.announcements.publishBirthdays(); toast.success(n ? 'Birthday wishes published' : 'Already wished today') }}>Publish wishes now</Button>
                </div>
              )}
              {birthdays.filter((b) => b.date !== today()).slice(0, 6).map((b) => (
                <div key={b.emp.id} className="flex items-center gap-3">
                  <Avatar name={b.emp.name} hue={b.emp.avatarHue} size={32} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{b.emp.name}</p><p className="text-xs text-subtle">{b.emp.department}</p></div>
                  <span className="text-xs font-bold text-muted">{fmtShort(b.date)}</span>
                </div>
              ))}
              {birthdays.length === 0 && <p className="text-sm text-subtle">No birthdays in the next 30 days.</p>}
            </div>
          </Card>
          <Card title="Upcoming events" icon={<CalendarDays className="h-4 w-4" />} action={<Button size="sm" variant="ghost" onClick={() => setCompose({ kind: 'event' })}>Add</Button>}>
            {events.length === 0 ? <p className="text-sm text-subtle">Nothing planned.</p> : (
              <ul className="flex flex-col gap-3">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="num flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft text-primary-ink"><span className="text-[9px] font-bold uppercase leading-none">{monthName(parseISO(e.eventDate!).getMonth())}</span><span className="text-sm font-extrabold leading-tight">{parseISO(e.eventDate!).getDate()}</span></span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{e.title}</p><p className="truncate text-xs text-subtle">{e.eventTime && fmtTime(e.eventTime)}{e.venue && ` · ${e.venue}`}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <Composer value={compose} departments={departments} onClose={() => setCompose(null)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete this post?" body="It will disappear from everyone’s feed."
        onConfirm={async () => { await api.announcements.remove(del!.id); setDel(null); toast.success('Post deleted') }} />
    </>
  )
}

function Composer({ value, departments, onClose }: { value: Partial<Announcement> | null; departments: string[]; onClose: () => void }) {
  const [f, setF] = useState<Partial<Announcement> & { when: 'now' | 'later'; push: boolean }>({ when: 'now', push: true })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (value) { setF({ kind: 'notice', title: '', body: '', audience: 'All employees', pinned: false, ...value, when: value.status === 'scheduled' ? 'later' : 'now', push: true, publishAt: value.publishAt ?? addDays(today(), 1) }); setErrors({}) }
  }, [value])
  if (!value) return null
  const editing = !!value.id
  const m = kindMeta(f.kind ?? 'notice')
  const submit = async () => {
    const e: Record<string, string> = {}
    if (!f.title?.trim()) e.title = 'Add a title'
    if (!f.body?.trim()) e.body = 'Write a message'
    if (f.kind === 'event' && !f.eventDate) e.eventDate = 'Pick the event date'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const data = { kind: f.kind!, title: f.title!, body: f.body!, audience: f.audience!, pinned: !!f.pinned, eventDate: f.eventDate, eventTime: f.eventTime, venue: f.venue, expiresAt: f.expiresAt || undefined, status: f.when === 'later' ? 'scheduled' as const : 'published' as const, publishAt: f.when === 'later' ? f.publishAt : undefined }
    if (editing) await api.announcements.update(value.id!, data); else await api.announcements.create(data)
    setBusy(false)
    toast.success(editing ? 'Post updated' : f.when === 'later' ? `Scheduled for ${fmtDate(f.publishAt!)}` : 'Published', { body: !editing && f.when === 'now' && f.push ? `Push notification sent to ${f.audience}.` : undefined })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" title={editing ? 'Edit post' : `New ${m.label.toLowerCase()}`} icon={<m.icon className="h-5 w-5" />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>{editing ? 'Save' : f.when === 'later' ? 'Schedule' : 'Publish'}</Button></>}>
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div className="grid gap-4">
          <Segmented value={f.kind ?? 'notice'} onChange={(k) => setF({ ...f, kind: k })} options={KINDS.map((k) => ({ value: k.value, label: k.label }))} />
          <Field label="Title" required error={errors.title}><Input value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Office closed for Diwali" maxLength={80} /></Field>
          <Field label="Message" required error={errors.body} hint={`${(f.body ?? '').length}/600`}><Textarea value={f.body ?? ''} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={600} placeholder="Write the announcement for your team…" /></Field>
          {f.kind === 'event' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Event date" required error={errors.eventDate}><Input type="date" value={f.eventDate ?? ''} onChange={(e) => setF({ ...f, eventDate: e.target.value })} /></Field>
              <Field label="Time"><Input type="time" value={f.eventTime ?? ''} onChange={(e) => setF({ ...f, eventTime: e.target.value })} /></Field>
              <Field label="Venue"><Input value={f.venue ?? ''} onChange={(e) => setF({ ...f, venue: e.target.value })} placeholder="e.g. Terrace" /></Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Audience"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} options={['All employees', ...departments]} /></Field>
            <Field label="Expires (optional)"><Input type="date" value={f.expiresAt ?? ''} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field>
            <Field label="When">
              <Select value={f.when} onChange={(e) => setF({ ...f, when: e.target.value as 'now' | 'later' })} options={[{ value: 'now', label: 'Publish now' }, { value: 'later', label: 'Schedule for later' }]} />
            </Field>
            {f.when === 'later' && <Field label="Publish on"><Input type="date" min={today()} value={f.publishAt ?? ''} onChange={(e) => setF({ ...f, publishAt: e.target.value })} /></Field>}
          </div>
          <div className="flex flex-wrap gap-6">
            <Checkbox checked={!!f.pinned} onChange={(v) => setF({ ...f, pinned: v })} label="Pin to top" />
            <Checkbox checked={f.push} onChange={(v) => setF({ ...f, push: v })} label="Send push notification" />
          </div>
        </div>
        <div className="hidden md:block">
          <p className="label-xs mb-2">Phone preview</p>
          <div className="rounded-[28px] border-[6px] border-ink/90 bg-gradient-to-b from-blue-500 to-orange-400 p-3 pt-8">
            <div className="rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-surface/90">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500"><span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[8px] text-white">S</span>SURFSYNC HRMS · now</div>
              <p className="mt-1 text-[13px] font-bold text-gray-900 dark:text-ink">{f.title || 'Your title'}</p>
              <p className="line-clamp-3 text-xs text-gray-600 dark:text-muted">{f.body || 'Your message will appear here.'}</p>
            </div>
            <div className="h-40" />
          </div>
        </div>
      </div>
    </Modal>
  )
}
