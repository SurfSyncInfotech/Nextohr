import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Icon from './Icon.jsx';
import Split from './Split.jsx';

/**
 * Starts a NextoHr HRMS trial via backend:
 *   POST {VITE_API_URL}/api/public/start-trial
 * Override with VITE_FORM_ENDPOINT if you need a custom URL.
 */
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const FORM_ENDPOINT =
  import.meta.env.VITE_FORM_ENDPOINT ||
  (API_BASE ? `${API_BASE}/api/public/start-trial` : '');
const PRODUCT_NAME = 'NextoHr';

async function notifyTrialStarted({ company, loginUrl }) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission !== 'granted') return;
    const n = new Notification(`${PRODUCT_NAME} trial ready`, {
      body: `${company} workspace is live. Check your email for sign-in details.`,
      icon: '/assets/favicon.svg',
      badge: '/assets/favicon.svg',
      tag: 'nextohr-trial-started',
    });
    n.onclick = () => {
      window.focus();
      if (loginUrl) window.open(loginUrl, '_blank', 'noopener');
      n.close();
    };
  } catch {
    /* notification is optional */
  }
}

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Please enter your full name.' : ''),
  company: (v) => (v.trim().length < 2 ? 'Please enter your company or business name.' : ''),
  email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Please enter a valid work email.' : ''),
  phone: (v) => (v.replace(/\D/g, '').length < 10 ? 'Please enter a phone number with at least 10 digits.' : ''),
};
const FIELDS = [
  ['name', 'Full name', 'text', 'name', 'e.g. Rahul Sharma', undefined],
  ['company', 'Company / business name', 'text', 'organization', 'e.g. Acme Studio', undefined],
  ['email', 'Work email', 'email', 'email', 'you@company.com', 'email'],
  ['phone', 'Phone / WhatsApp number', 'tel', 'tel', '+91 98765 43210', 'tel'],
];
const MODULES = [['attendance', 'Attendance & GPS'], ['leave', 'Leave & approvals'], ['payroll', 'Payroll & compliance'], ['hiring', 'Hiring & onboarding'], ['goals', 'Goals & work reports']];
const SIZES = ['1–10 people', '11–50 people', '51–200 people', '201–500 people', '500+ people'];
const EMPTY = { name: '', company: '', email: '', phone: '', teamSize: '' };

export default function DemoForm({ plan, setPlan }) {
  const [values, setValues] = useState(EMPTY);
  const [modules, setModules] = useState(['attendance']);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(null);
  const inputs = useRef({});
  const doneRef = useRef(null);

  const validate = (k, v) => { const msg = RULES[k](v); setErrors((e) => ({ ...e, [k]: msg })); return !msg; };
  const set = (k) => (e) => { const v = e.target.value; setValues((s) => ({ ...s, [k]: v })); if (RULES[k] && errors[k]) validate(k, v); };
  const toggleModule = (m) => setModules((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));

  const submit = async (e) => {
    e.preventDefault();
    setStatus('');
    const next = {}; Object.keys(RULES).forEach((k) => { next[k] = RULES[k](values[k]); });
    setErrors(next);
    const firstBad = Object.keys(RULES).find((k) => next[k]);
    if (firstBad) { inputs.current[firstBad]?.focus(); return; }

    if (!FORM_ENDPOINT) {
      setStatus('Trial API is not configured. Set VITE_API_URL in the landing .env (e.g. http://localhost:5000).');
      return;
    }

    const payload = {
      name: values.name.trim(),
      companyName: values.company.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      companySize: values.teamSize || undefined,
      preferredPlan: plan || undefined,
      interestedModules: modules,
    };

    setBusy(true);
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || (res.status === 409 ? 'An account with this email already exists.' : 'Could not start your trial.'));
      }
      const donePayload = {
        firstName: values.name.trim().split(/\s+/)[0],
        company: values.company.trim(),
        emailSent: !!body.emailSent,
        loginUrl: body.loginUrl || '',
        adminEmail: body.adminEmail || values.email.trim().toLowerCase(),
        temporaryPassword: body.temporaryPassword || '',
        message: body.message || '',
      };
      setDone(donePayload);
      void notifyTrialStarted({ company: donePayload.company, loginUrl: donePayload.loginUrl });
    } catch (err) {
      setStatus(err.message || 'Something went wrong starting your trial. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const el = doneRef.current; if (!done || !el) return;
    el.focus({ preventScroll: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el, { y: 20, autoAlpha: 0, duration: .8, ease: 'expo.out' });
      gsap.fromTo(el.querySelectorAll('circle, path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .8, ease: 'power3.inOut', stagger: .35 });
    });
    return () => ctx.revert();
  }, [done]);

  const reset = () => {
    setValues(EMPTY); setModules(['attendance']); setErrors({}); setPlan('standard'); setDone(null); setStatus('');
    setTimeout(() => inputs.current.name?.focus(), 0);
  };

  return (
    <section className="demo-sec" id="demo" aria-labelledby="demo-title">
      <div className="demo-panel">
        <svg className="demo-lines" viewBox="0 0 1500 1000" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="1" d="M100 0 C 150 300, 160 600, 0 1000" />
          <path pathLength="1" d="M175 80 C 220 380, 210 700, 40 1000" />
          <path pathLength="1" d="M1500 20 C 1300 300, 1260 650, 1330 940" />
          <path pathLength="1" d="M1500 140 C 1380 400, 1340 700, 1400 980" />
        </svg>
        <div className="demo-copy">
          <Split id="demo-title" className="h-xl">Start your free <em>HRMS trial.</em></Split>
          <p className="sec-sub">We’ll create your company workspace and email you the admin sign-in.</p>
        </div>

        <form className={`dform${busy ? ' is-busy' : ''}`} id="demoForm" noValidate onSubmit={submit} hidden={!!done}>
          <div className="dform__grid">
            {FIELDS.map(([k, label, type, ac, ph, im]) => (
              <div className="fld" key={k}>
                <label htmlFor={`f-${k}`}>{label} <span aria-hidden="true">*</span></label>
                <input
                  id={`f-${k}`} name={k} type={type} autoComplete={ac} inputMode={im} placeholder={ph} required aria-describedby={`e-${k}`}
                  ref={(el) => { inputs.current[k] = el; }} value={values[k]} onChange={set(k)}
                  onBlur={(e) => { if (e.target.value) validate(k, e.target.value); }}
                  aria-invalid={errors[k] === undefined ? undefined : !!errors[k]}
                />
                <p className="fld__err" id={`e-${k}`}>{errors[k]}</p>
              </div>
            ))}
            <div className="fld">
              <label htmlFor="f-size">Team size</label>
              <div className="sel">
                <select id="f-size" name="teamSize" className={values.teamSize ? '' : 'is-empty'} value={values.teamSize} onChange={set('teamSize')}>
                  <option value="">Select team size</option>
                  {SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <Icon name="solar:alt-arrow-down-linear" aria-hidden="true" />
              </div>
            </div>
            <fieldset className="fld seg-fld">
              <legend>Plan interest</legend>
              <div className="seg">
                {[['standard', 'Standard'], ['white-label', 'White-label']].map(([v, l]) => (
                  <label key={v}><input type="radio" name="plan" value={v} checked={plan === v} onChange={() => setPlan(v)} /><span>{l}</span></label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="chips-fld">
            <legend>What would you like to explore?</legend>
            <div className="chips">
              {MODULES.map(([v, l]) => (
                <label className="ch" key={v}><input type="checkbox" name="modules" value={v} checked={modules.includes(v)} onChange={() => toggleModule(v)} /><span>{l}</span></label>
              ))}
            </div>
          </fieldset>

          <button className="dform__submit" type="submit"><span className="lbl">Start free trial <Icon name="solar:arrow-right-linear" /></span><span className="spin" aria-hidden="true"></span></button>
          <p className="dform__note"><Icon name="solar:lock-keyhole-minimalistic-bold" /> Trial modules follow your Super Admin plan · Cancel anytime before you pay.</p>
          <p className="dform__status" role="status" aria-live="polite">{status}</p>
        </form>

        <div className="dform-done" id="demoDone" hidden={!done} tabIndex={-1} ref={doneRef}>
          <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" pathLength="1" /><path d="M25 41 l10 10 l20 -22" pathLength="1" /></svg>
          <h3>Your trial is ready, <span className="dn-name">{done?.firstName || 'there'}</span>.</h3>
          {done?.emailSent ? (
            <p>We emailed sign-in details to your work inbox. Open the link in that email — it opens your company workspace.</p>
          ) : (
            <p>
              Your workspace is live. {done?.temporaryPassword
                ? <>Use email <strong>{done.adminEmail}</strong> and temporary password <strong>{done.temporaryPassword}</strong>. Click the button below to open the correct company sign-in (invite email could not be sent).</>
                : 'Check with support if you do not receive the invite email.'}
            </p>
          )}
          {done?.loginUrl && (
            <p style={{ marginTop: 16 }}>
              <a className="btn btn--plum" href={done.loginUrl} target="_blank" rel="noopener noreferrer">
                Open admin sign-in <Icon name="solar:arrow-right-linear" />
              </a>
              <span className="dform__note" style={{ display: 'block', marginTop: 10 }}>
                Sign-in link includes your company: <code style={{ fontSize: 12 }}>{done.loginUrl.replace(/^https?:\/\//, '')}</code>
              </span>
            </p>
          )}
          <button type="button" className="link-quiet" id="demoAgain" onClick={reset}>Start another trial</button>
        </div>

        <p className="demo-foot">Instant workspace · Modules from Super Admin plan · Billing / Upgrade after trial</p>
      </div>
    </section>
  );
}
