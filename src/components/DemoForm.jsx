import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Icon from './Icon.jsx';
import Split from './Split.jsx';

// Set VITE_FORM_ENDPOINT in .env to POST the request (JSON) to your API.
// Without it, submitting only shows the confirmation — nothing leaves the browser.
const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT || '';

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
  const [doneName, setDoneName] = useState(null);
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
    const data = { ...values, plan, modules };
    setBusy(true);
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error('send failed');
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
      setDoneName(values.name.trim().split(/\s+/)[0]);
    } catch {
      setStatus('Something went wrong sending this. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  // Confirmation entrance: tick draws in.
  useEffect(() => {
    const el = doneRef.current; if (!doneName || !el) return;
    el.focus({ preventScroll: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el, { y: 20, autoAlpha: 0, duration: .8, ease: 'expo.out' });
      gsap.fromTo(el.querySelectorAll('circle, path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .8, ease: 'power3.inOut', stagger: .35 });
    });
    return () => ctx.revert();
  }, [doneName]);

  const reset = () => {
    setValues(EMPTY); setModules(['attendance']); setErrors({}); setPlan('standard'); setDoneName(null);
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
          <Split id="demo-title" className="h-xl">Your next payroll is <em>already on its way.</em></Split>
          <p className="sec-sub">Book a demo and let Nextohr run this one.</p>
        </div>

        <form className={`dform${busy ? ' is-busy' : ''}`} id="demoForm" noValidate onSubmit={submit} hidden={!!doneName}>
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
              <legend>Plan</legend>
              <div className="seg">
                {[['standard', 'Standard'], ['white-label', 'White-label']].map(([v, l]) => (
                  <label key={v}><input type="radio" name="plan" value={v} checked={plan === v} onChange={() => setPlan(v)} /><span>{l}</span></label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="chips-fld">
            <legend>What would you like to see?</legend>
            <div className="chips">
              {MODULES.map(([v, l]) => (
                <label className="ch" key={v}><input type="checkbox" name="modules" value={v} checked={modules.includes(v)} onChange={() => toggleModule(v)} /><span>{l}</span></label>
              ))}
            </div>
          </fieldset>

          <button className="dform__submit" type="submit"><span className="lbl">Book a demo <Icon name="solar:arrow-right-linear" /></span><span className="spin" aria-hidden="true"></span></button>
          <p className="dform__note"><Icon name="solar:lock-keyhole-minimalistic-bold" /> Strictly confidential · We will never spam or sell your information.</p>
          <p className="dform__status" role="status" aria-live="polite">{status}</p>
        </form>

        <div className="dform-done" id="demoDone" hidden={!doneName} tabIndex={-1} ref={doneRef}>
          <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" pathLength="1" /><path d="M25 41 l10 10 l20 -22" pathLength="1" /></svg>
          <h3>You're booked in, <span className="dn-name">{doneName || 'there'}</span>.</h3>
          <p>We'll call you within one working day to pick a time for your 20-minute demo.</p>
          <button type="button" className="link-quiet" id="demoAgain" onClick={reset}>Send another request</button>
        </div>

        <p className="demo-foot">20-minute call · Set up with your own team as the example</p>
      </div>
    </section>
  );
}
