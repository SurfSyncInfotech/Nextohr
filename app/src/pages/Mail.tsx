import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Clock, FileText, Forward, Inbox, Mail as MailIcon, Paperclip, PenSquare, Plus, Reply, Send, Star, Trash2, X, FileStack, Pencil, Archive,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import type { Mail, MailFolder, MailTemplate } from '@/data/types'
import { cn, fmtDate, relTime } from '@/lib/utils'
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, FileDrop, IconButton, Input, Modal, SearchInput, Select, Textarea, toast } from '@/components/ui'

type View = MailFolder | 'starred' | 'templates'
const FOLDERS: { value: View; label: string; icon: typeof Inbox }[] = [
  { value: 'inbox', label: 'Inbox', icon: Inbox }, { value: 'starred', label: 'Starred', icon: Star }, { value: 'sent', label: 'Sent', icon: Send },
  { value: 'scheduled', label: 'Scheduled', icon: Clock }, { value: 'drafts', label: 'Drafts', icon: FileText }, { value: 'templates', label: 'Templates', icon: FileStack },
  { value: 'trash', label: 'Trash', icon: Trash2 },
]

interface Draft { to: string; cc: string; subject: string; body: string; attachments: string[]; schedule: string }

export default function MailPage() {
  const [params, setParams] = useSearchParams()
  const { mails, templates, me } = useDb((db) => ({ mails: db.mails, templates: db.mailTemplates, me: db.company.email }))
  const [view, setView] = useState<View>('inbox')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [compose, setCompose] = useState<Partial<Draft> | null>(null)
  const [tpl, setTpl] = useState<Partial<MailTemplate> | null>(null)
  const [delTpl, setDelTpl] = useState<MailTemplate | null>(null)

  useEffect(() => {
    const to = params.get('to')
    if (to) { setCompose({ to }); params.delete('to'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const list = useMemo(() => mails
    .filter((m) => (view === 'starred' ? m.starred && m.folder !== 'trash' : m.folder === view))
    .filter((m) => !q || `${m.subject} ${m.body} ${m.from.name} ${m.to.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [mails, view, q])
  const open = mails.find((m) => m.id === openId)
  const count = (v: View) => v === 'inbox' ? mails.filter((m) => m.folder === 'inbox' && !m.read).length : v === 'drafts' ? mails.filter((m) => m.folder === 'drafts').length : v === 'scheduled' ? mails.filter((m) => m.folder === 'scheduled').length : 0

  const select = (m: Mail) => { setOpenId(m.id); if (!m.read) api.mail.patch([m.id], { read: true }); if (m.folder === 'drafts') setCompose({ to: m.to.join(', '), subject: m.subject, body: m.body }) }

  return (
    <div className="card flex h-[calc(100vh-150px)] min-h-[560px] overflow-hidden">
      <h1 className="sr-only">Mail</h1>
      {/* folders */}
      <nav className="hidden w-56 shrink-0 flex-col border-r border-line p-3 md:flex" aria-label="Mail folders">
        <Button variant="primary" className="mb-3 w-full" icon={<PenSquare className="h-4 w-4" />} onClick={() => setCompose({})}>Compose</Button>
        <div className="mb-3 truncate rounded-xl bg-surface-2 px-3 py-2 text-xs font-semibold text-muted" title={me}>{me}</div>
        {FOLDERS.map((f) => (
          <button key={f.value} onClick={() => { setView(f.value); setOpenId(null) }}
            className={cn('flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-semibold', view === f.value ? 'bg-primary-soft text-primary-ink' : 'text-muted hover:bg-surface-3 hover:text-ink')}>
            <f.icon className="h-4 w-4" /><span className="flex-1 text-left">{f.label}</span>
            {count(f.value) > 0 && <span className="num text-xs font-bold">{count(f.value)}</span>}
          </button>
        ))}
      </nav>

      {/* list */}
      <section className={cn('flex w-full flex-col border-r border-line md:w-[360px] md:shrink-0', open && 'hidden lg:flex')}>
        <div className="flex items-center gap-2 border-b border-line p-3">
          <Select className="w-32 md:hidden" value={view} onChange={(e) => setView(e.target.value as View)} aria-label="Folder" options={FOLDERS.map((f) => ({ value: f.value, label: f.label }))} />
          <SearchInput className="flex-1" value={q} onChange={setQ} placeholder="Search mail" />
          <IconButton className="md:hidden" variant="primary" label="Compose" icon={<PenSquare className="h-4 w-4" />} onClick={() => setCompose({})} />
        </div>
        {view === 'templates' ? (
          <div className="scroll-thin flex-1 overflow-y-auto p-3">
            <Button size="sm" className="mb-3 w-full" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setTpl({ name: '', subject: '', body: '', category: 'General' })}>New template</Button>
            {templates.map((t) => (
              <div key={t.id} className="mb-2 rounded-xl border border-line p-3">
                <div className="flex items-center gap-2"><p className="flex-1 text-sm font-bold">{t.name}</p><Badge tone="blue">{t.category}</Badge></div>
                <p className="mt-1 truncate text-xs text-subtle">{t.subject}</p>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="soft" onClick={() => setCompose({ subject: t.subject, body: t.body })}>Use</Button>
                  <IconButton size="icon-sm" label="Edit template" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setTpl(t)} />
                  <IconButton size="icon-sm" label="Delete template" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDelTpl(t)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="scroll-thin flex-1 overflow-y-auto">
            {list.length === 0 && <EmptyState icon={<MailIcon className="h-5 w-5" />} title={q ? 'No matches' : 'Nothing here'} />}
            {list.map((m) => {
              const who = m.folder === 'inbox' || m.folder === 'trash' ? m.from.name : `To: ${m.to.join(', ')}`
              return (
                <li key={m.id}>
                  <button onClick={() => select(m)} className={cn('flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors', openId === m.id ? 'bg-primary-soft/60' : 'hover:bg-surface-2')}>
                    <Avatar name={m.folder === 'inbox' ? m.from.name : m.to[0] ?? '?'} hue={(m.from.name.charCodeAt(0) * 29) % 360} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('flex-1 truncate text-sm', m.read ? 'font-medium text-muted' : 'font-extrabold text-ink')}>{who}</span>
                        <span className="shrink-0 text-[11px] text-subtle">{m.folder === 'scheduled' ? fmtDate(m.date.slice(0, 10)) : relTime(m.date)}</span>
                      </div>
                      <p className={cn('truncate text-[13px]', m.read ? 'text-ink' : 'font-bold')}>{m.subject}</p>
                      <p className="truncate text-xs text-subtle">{m.body.replace(/\n/g, ' ')}</p>
                      {(m.attachments?.length || m.labels?.length || m.starred) && (
                        <div className="mt-1 flex items-center gap-1.5">
                          {m.starred && <Star className="h-3 w-3 fill-primary text-primary" />}
                          {m.attachments?.length ? <Paperclip className="h-3 w-3 text-subtle" /> : null}
                          {m.labels?.map((l) => <Badge key={l} tone="blue" className="!py-0 text-[10px]">{l}</Badge>)}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* reader */}
      <section className={cn('min-w-0 flex-1 flex-col', open ? 'flex' : 'hidden lg:flex')}>
        {!open ? <EmptyState className="m-auto" icon={<MailIcon className="h-5 w-5" />} title="Select a conversation" body="Pick an email from the list to read it here." /> : (
          <>
            <div className="flex items-center gap-1 border-b border-line px-4 py-2.5">
              <IconButton className="lg:hidden" label="Back to list" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setOpenId(null)} />
              <IconButton label="Reply" icon={<Reply className="h-4 w-4" />} onClick={() => setCompose({ to: open.folder === 'inbox' ? open.from.email : open.to.join(', '), subject: `Re: ${open.subject}`, body: `\n\n— On ${fmtDate(open.date.slice(0, 10))}, ${open.from.name} wrote:\n> ${open.body.replace(/\n/g, '\n> ')}` })} />
              <IconButton label="Forward" icon={<Forward className="h-4 w-4" />} onClick={() => setCompose({ subject: `Fwd: ${open.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${open.from.name} <${open.from.email}>\n\n${open.body}` })} />
              <IconButton label={open.starred ? 'Unstar' : 'Star'} icon={<Star className={cn('h-4 w-4', open.starred && 'fill-primary text-primary')} />} onClick={() => api.mail.patch([open.id], { starred: !open.starred })} />
              <IconButton label="Mark unread" icon={<Archive className="h-4 w-4" />} onClick={() => { api.mail.patch([open.id], { read: false }); setOpenId(null) }} />
              <IconButton className="ml-auto" label={open.folder === 'trash' ? 'Delete forever' : 'Move to trash'} icon={<Trash2 className="h-4 w-4" />} onClick={async () => { await api.mail.remove([open.id]); setOpenId(null); toast.success(open.folder === 'trash' ? 'Deleted forever' : 'Moved to trash', { action: open.folder !== 'trash' ? { label: 'Undo', onClick: () => api.mail.patch([open.id], { folder: open.folder }) } : undefined }) }} />
            </div>
            <article className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
              <h2 className="text-xl font-extrabold tracking-tight">{open.subject}</h2>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={open.from.name} hue={(open.from.name.charCodeAt(0) * 29) % 360} size={40} />
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">{open.from.name} <span className="font-normal text-subtle">&lt;{open.from.email}&gt;</span></p><p className="truncate text-xs text-subtle">to {open.to.join(', ')}{open.cc?.length ? `, cc ${open.cc.join(', ')}` : ''}</p></div>
                <span className="text-xs text-subtle">{new Date(open.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-ink">{open.body}</div>
              {open.attachments?.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {open.attachments.map((a) => (
                    <button key={a.name} onClick={() => toast.success(`${a.name} downloaded`)} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-left hover:bg-surface-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-soft text-danger"><Paperclip className="h-4 w-4" /></span>
                      <span><span className="block text-[13px] font-semibold">{a.name}</span><span className="block text-[11px] text-subtle">{a.size}</span></span>
                    </button>
                  ))}
                </div>
              ) : null}
              {open.folder === 'inbox' && <Button className="mt-8" icon={<Reply className="h-4 w-4" />} onClick={() => setCompose({ to: open.from.email, subject: `Re: ${open.subject}`, body: '' })}>Reply</Button>}
            </article>
          </>
        )}
      </section>

      <Composer value={compose} templates={templates} onClose={() => setCompose(null)} />
      <TemplateModal value={tpl} onClose={() => setTpl(null)} />
      <ConfirmDialog open={!!delTpl} onClose={() => setDelTpl(null)} title={`Delete “${delTpl?.name}”?`} onConfirm={async () => { await api.mailTemplates.remove(delTpl!.id); setDelTpl(null); toast.success('Template deleted') }} />
    </div>
  )
}

function Composer({ value, templates, onClose }: { value: Partial<Draft> | null; templates: MailTemplate[]; onClose: () => void }) {
  const people = useDb((db) => db.employees.filter((e) => e.status !== 'inactive'))
  const [f, setF] = useState<Draft>({ to: '', cc: '', subject: '', body: '', attachments: [], schedule: '' })
  const [showCc, setShowCc] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (value) { setF({ to: '', cc: '', subject: '', body: '', attachments: [], schedule: '', ...value }); setErr(''); setScheduling(false) } }, [value])
  if (!value) return null
  const split = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)
  const lastToken = f.to.split(/[,;]\s*/).pop() ?? ''
  const suggestions = lastToken.length >= 1 ? people.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(lastToken.toLowerCase()) && !f.to.includes(p.email)).slice(0, 5) : []
  const send = async (schedule?: string) => {
    const to = split(f.to)
    if (!to.length || to.some((x) => !/^\S+@\S+\.\S+$/.test(x))) { setErr('Add at least one valid recipient email'); return }
    if (!f.subject.trim()) { setErr('Add a subject'); return }
    setBusy(true)
    await api.mail.send({ to, cc: split(f.cc), subject: f.subject, body: f.body, attachments: f.attachments.map((n) => ({ name: n, size: '—' })) }, schedule ? new Date(schedule).toISOString() : undefined)
    setBusy(false)
    toast.success(schedule ? `Scheduled for ${new Date(schedule).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Email sent')
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" title="New message" icon={<PenSquare className="h-5 w-5" />}
      footer={<>
        <Button variant="ghost" className="mr-auto" onClick={async () => { await api.mail.saveDraft({ to: split(f.to), cc: split(f.cc), subject: f.subject || '(no subject)', body: f.body }); toast.success('Saved to drafts'); onClose() }}>Save draft</Button>
        {scheduling ? (
          <>
            <Input type="datetime-local" className="w-56" value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} aria-label="Send at" />
            <Button onClick={() => setScheduling(false)}>Cancel</Button>
            <Button variant="primary" disabled={!f.schedule} loading={busy} icon={<Clock className="h-4 w-4" />} onClick={() => send(f.schedule)}>Schedule</Button>
          </>
        ) : (
          <>
            <Button icon={<Clock className="h-4 w-4" />} onClick={() => setScheduling(true)}>Schedule</Button>
            <Button variant="primary" loading={busy} icon={<Send className="h-4 w-4" />} onClick={() => send()}>Send</Button>
          </>
        )}
      </>}>
      <div className="grid gap-3">
        <div className="relative">
          <Field label="To" error={err}>
            <Input value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="Type a name or email — separate with commas" autoFocus
              trailing={!showCc ? <button type="button" className="px-1 text-xs font-bold text-accent-ink" onClick={() => setShowCc(true)}>Cc</button> : undefined} />
          </Field>
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-line bg-surface p-1 shadow-pop">
              {suggestions.map((p) => (
                <li key={p.id}><button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-3"
                  onClick={() => setF({ ...f, to: [...f.to.split(/[,;]\s*/).slice(0, -1), p.email].join(', ') + ', ' })}>
                  <Avatar name={p.name} hue={p.avatarHue} size={24} /><span className="text-sm font-semibold">{p.name}</span><span className="truncate text-xs text-subtle">{p.email}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        {showCc && <Field label="Cc"><Input value={f.cc} onChange={(e) => setF({ ...f, cc: e.target.value })} trailing={<button type="button" aria-label="Remove cc" onClick={() => { setShowCc(false); setF({ ...f, cc: '' }) }}><X className="h-3.5 w-3.5 text-subtle" /></button>} /></Field>}
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Field label="Subject"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="Template"><Select value="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) setF({ ...f, subject: t.subject, body: t.body }) }} options={[{ value: '', label: 'Insert template…' }, ...templates.map((t) => ({ value: t.id, label: t.name }))]} /></Field>
        </div>
        <Field label="Message" hint="Placeholders like {{name}} are filled per recipient."><Textarea className="min-h-[220px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Write your message…" /></Field>
        <FileDrop label="Attachments" multiple value={f.attachments} onChange={(n) => setF({ ...f, attachments: [...f.attachments, ...n] })} />
      </div>
    </Modal>
  )
}

function TemplateModal({ value, onClose }: { value: Partial<MailTemplate> | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<MailTemplate>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (value) setF(value) }, [value])
  return (
    <Modal open={!!value} onClose={onClose} title={value?.id ? 'Edit template' : 'New template'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.name || !f.subject} onClick={async () => {
        setBusy(true)
        if (value?.id) await api.mailTemplates.update(value.id, f); else await api.mailTemplates.create(f as MailTemplate)
        setBusy(false); toast.success('Template saved'); onClose()
      }}>Save template</Button></>}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required><Input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Interview invite" /></Field>
          <Field label="Category"><Select value={f.category ?? 'General'} onChange={(e) => setF({ ...f, category: e.target.value })} options={['General', 'Hiring', 'Onboarding', 'Payroll', 'Exit']} /></Field>
        </div>
        <Field label="Subject" required><Input value={f.subject ?? ''} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Body" hint="Use {{name}}, {{role}}, {{date}}, {{month}} as placeholders."><Textarea className="min-h-[180px]" value={f.body ?? ''} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}
