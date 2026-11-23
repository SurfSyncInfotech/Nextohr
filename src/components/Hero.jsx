import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Split from './Split.jsx';
import { WIDE_RIBBON_D } from './Logo.jsx';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'solar:widget-5-bold-duotone', alt: "Nextohr dashboard showing headcount, attendance rate, attendance trend and today's live check-ins" },
  { key: 'employees', label: 'People', icon: 'solar:users-group-rounded-bold-duotone', alt: 'Nextohr employee directory with filters and profile completeness' },
  { key: 'attendance', label: 'Attendance', icon: 'solar:map-point-wave-bold-duotone', alt: 'Nextohr live attendance board with check-in times and locations' },
  { key: 'payroll', label: 'Payroll', icon: 'solar:wallet-money-bold-duotone', alt: 'Nextohr payroll overview with next pay run and past payouts' },
];

export default function Hero() {
  const [active, setActive] = useState(0);
  const touched = useRef(false);

  // Auto-rotate the screens while the hero is on screen (motion layer sends nx:hero-tabs true/false).
  useEffect(() => {
    let timer = null;
    const onToggle = (e) => {
      clearInterval(timer); timer = null;
      if (e.detail && !touched.current) timer = setInterval(() => setActive((i) => (i + 1) % TABS.length), 4200);
    };
    addEventListener('nx:hero-tabs', onToggle);
    return () => { clearInterval(timer); removeEventListener('nx:hero-tabs', onToggle); };
  }, []);

  const pick = (i) => { touched.current = true; dispatchEvent(new CustomEvent('nx:hero-tabs', { detail: false })); setActive(i); };

  return (
    <section className="hero" id="top">
      <svg className="hero__ribbon" viewBox="0 0 1600 600" preserveAspectRatio="none" aria-hidden="true">
        <path className="hero__ribbon-path" pathLength="1" d={WIDE_RIBBON_D} />
      </svg>
      <div className="hero__copy">
        <p className="eyebrow hero__eyebrow"><span className="dot"></span> The people platform for growing teams</p>
        <Split as="h1" className="hero__title">HR that <em>flows.</em></Split>
        <p className="hero__sub">Attendance, leave, payroll, hiring and goals in one calm workspace, so your people team spends time on people.</p>
        <div className="hero__ctas">
          <a href="#demo" className="btn btn--plum btn--lg">Book a demo <Icon name="solar:arrow-right-linear" /></a>
          <a href="#film" className="btn btn--ghost btn--lg"><span className="play-dot"><Icon name="solar:play-bold" /></span> Watch the film</a>
        </div>
        <p className="hero__trust"><Icon name="solar:check-circle-bold" /> 20-minute demo <span>·</span> Live in an afternoon <span>·</span> Built for Indian payroll</p>
      </div>

      <div className="hero__stage">
        <div className="hero__tabs" role="tablist" aria-label="Product screens">
          {TABS.map((t, i) => (
            <button key={t.key} role="tab" aria-selected={i === active} data-shot={t.key} onClick={() => pick(i)}>
              <Icon name={t.icon} />{t.label}
            </button>
          ))}
        </div>
        <div className="hero__frame-wrap">
          <figure className="frame hero__frame">
            <div className="frame__bar"><i></i><i></i><i></i><span className="frame__url"><Icon name="solar:lock-keyhole-minimalistic-bold" />app.nextohr.com</span></div>
            <div className="frame__screen">
              {TABS.map((t, i) => (
                <img key={t.key} className={`hero__shot${i === active ? ' is-on' : ''}`} data-shot={t.key} src={`/assets/shots/${t.key}.webp`} width="1920" height="1200" alt={t.alt} loading={i ? 'lazy' : undefined} />
              ))}
            </div>
          </figure>
          <div className="chip chip--a"><span className="chip__ic ok"><Icon name="solar:check-read-linear" /></span><div><b>Leave approved</b><small>Ananya Iyer · 2 days</small></div></div>
          <div className="chip chip--b"><span className="chip__ic plum"><Icon name="solar:wallet-money-bold" /></span><div><b>November payroll</b><small>₹10.79 L · ready to pay</small></div></div>
          <div className="chip chip--c"><span className="chip__ic coral"><Icon name="solar:map-point-bold" /></span><div><b>Priya checked in · 8:43</b><small>Face scan · Noida HQ</small></div></div>
          <div className="chip chip--d"><div className="chip__stat"><small>Attendance</small><b>94.3%</b><em>↑ 0.2 pts</em></div></div>
        </div>
      </div>
    </section>
  );
}
