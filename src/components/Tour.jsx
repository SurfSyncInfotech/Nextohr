import { useEffect, useState } from 'react';
import Split from './Split.jsx';

const STEPS = [
  { shot: 'attendance', title: "Know who's in before standup.", text: 'GPS and face-scan check-ins land on a live board. Late, missing and on-leave sorted for you.', alt: 'Live attendance board' },
  { shot: 'approvals', title: 'One inbox for every yes.', text: 'Leave, work reports and offers wait in one queue, with balance and team overlap right beside them.', alt: 'Approvals inbox with leave requests' },
  { shot: 'onboarding', title: 'From offer letter to first day.', text: 'A hiring pipeline with a live letter preview and a joiner checklist that runs itself.', alt: 'Hiring and onboarding pipeline' },
  { shot: 'payroll', title: 'Payroll in three steps.', text: 'Pick the period, review loss of pay, preview. PF, ESI, PT and TDS worked out, payslips and bank file ready.', alt: 'Payroll overview' },
  { shot: 'goals', title: 'Goals that check themselves in.', text: 'Measurable targets, weekly check-ins and early warnings when something starts to slip.', alt: 'Goals with progress and status' },
];

export default function Tour() {
  const [active, setActive] = useState(0);

  // The pinned ScrollTrigger (desktop) reports the active step.
  useEffect(() => {
    const on = (e) => setActive(e.detail);
    addEventListener('nx:tour-step', on);
    return () => removeEventListener('nx:tour-step', on);
  }, []);

  const go = (i) => {
    // On desktop the motion layer scrolls to that step; otherwise just switch.
    const ev = new CustomEvent('nx:tour-goto', { detail: { i, handled: false } });
    dispatchEvent(ev);
    if (!ev.detail.handled) setActive(i);
  };

  return (
    <section className="tour" id="tour" aria-labelledby="tour-title">
      <div className="tour__head">
        <p className="eyebrow">How it works</p>
        <Split id="tour-title" className="h-lg">One flow, from <em>check-in</em> to payslip.</Split>
      </div>
      <div className="tour__body">
        <ol className="tour__steps">
          {STEPS.map((s, i) => (
            <li key={s.shot} className={`tstep${i === active ? ' is-active' : ''}`} data-step={i} onClick={() => go(i)}>
              <span className="tstep__n">{String(i + 1).padStart(2, '0')}</span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
              <img className="tstep__img" src={`/assets/shots/${s.shot}.webp`} alt={s.alt} loading="lazy" width="1920" height="1200" />
            </li>
          ))}
        </ol>
        <div className="tour__visual" aria-hidden="true">
          <div className="tour__rail"><span className="tour__rail-fill"></span></div>
          <figure className="frame tour__frame">
            <div className="frame__bar"><i></i><i></i><i></i><span className="frame__url">app.nextohr.com</span></div>
            <div className="frame__screen">
              {STEPS.map((s, i) => (
                <img key={s.shot} className={`tour__shot${i === active ? ' is-on' : ''}`} src={`/assets/shots/${s.shot}.webp`} alt="" loading="lazy" width="1920" height="1200" />
              ))}
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
