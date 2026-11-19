import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useDb } from '@/data/db'
import { LogoFull } from '@/components/layout/Logo'
import { Button, Checkbox, Field, Input } from '@/components/ui'

export default function Login() {
  const nav = useNavigate()
  const { branding, company } = useDb((db) => ({ branding: db.branding, company: db.company }))
  const [email, setEmail] = useState(company.email)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('Enter the email you use for SurfSync'); return }
    if (password.length < 4) { setErr('Enter your password'); return }
    setErr('')
    setBusy(true)
    // Demo: any password signs in. Replace with the auth endpoint.
    setTimeout(() => nav('/'), 700)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block" style={{ background: `linear-gradient(140deg, ${branding.secondary}, ${branding.primary})` }}>
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-white/10" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <LogoFull chip height={40} className="self-start" />
          <div>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">People ops that run themselves.</h1>
            <p className="mt-4 max-w-md text-[15px] text-white/85">Attendance with GPS and face scan, leave, payroll with Indian statutory compliance, offer letters and daily reports — in one place.</p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[['22', 'people'], ['96%', 'attendance'], ['<2 min', 'payroll run']].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/15 p-4 backdrop-blur"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-white/80">{l}</p></div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/70">© {new Date().getFullYear()} {company.legalName}</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-surface px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <LogoFull height={44} className="mb-8 lg:hidden" />
          <h2 className="text-2xl font-extrabold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-subtle">{branding.tagline}</p>
          <div className="mt-8 flex flex-col gap-4">
            <Field label="Work email" htmlFor="email"><Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="h-4 w-4" />} /></Field>
            <Field label="Password" htmlFor="password" error={err}>
              <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" aria-invalid={!!err}
                leading={<Lock className="h-4 w-4" />}
                trailing={<button type="button" onClick={() => setShow((s) => !s)} className="rounded-md p-1.5 text-subtle hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
            </Field>
            <div className="flex items-center justify-between">
              <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in" />
              <button type="button" className="text-sm font-semibold text-accent-ink hover:underline">Forgot password?</button>
            </div>
            <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-2 w-full">Sign in</Button>
          </div>
          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-subtle"><ShieldCheck className="h-3.5 w-3.5" /> Demo build — any password works.</p>
        </form>
      </div>
    </div>
  )
}
