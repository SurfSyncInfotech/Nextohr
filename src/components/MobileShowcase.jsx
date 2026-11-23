import Split from './Split.jsx';

const PHONES = [['p1', 'm-attendance', 'Attendance on mobile'], ['p2', 'm-dashboard', 'Dashboard on mobile'], ['p3', 'm-leave', 'Leave requests on mobile']];

export default function MobileShowcase() {
  return (
    <section className="mobile" aria-labelledby="mobile-title">
      <div className="sec-head">
        <p className="eyebrow">Everywhere</p>
        <Split id="mobile-title" className="h-lg">HR in <em>every pocket.</em></Split>
        <p className="sec-sub">Check in, apply for leave or approve a request from your phone. Every screen is built for touch.</p>
      </div>
      <div className="phones">
        {PHONES.map(([cls, shot, alt]) => (
          <figure key={cls} className={`phone ${cls}`}><img src={`/assets/shots/${shot}.webp`} alt={alt} loading="lazy" width="780" height="1688" /></figure>
        ))}
      </div>
    </section>
  );
}
