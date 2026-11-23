import { RIBBON_D } from './Logo.jsx';

// Logo motion intro (~4.6s). Animated by src/motion/initLanding.js, removed when it finishes.
export default function Intro() {
  return (
    <div className="intro" id="intro" aria-hidden="true">
      <div className="intro__bg"></div>
      <div className="intro__stage">
        <svg className="intro__logo" id="introLogo" viewBox="296 428 876 212">
          <defs>
            <linearGradient id="ix-rib" gradientUnits="userSpaceOnUse" x1="851" y1="0" x2="975" y2="0">
              <stop offset="0" stopColor="#5E0E51" /><stop offset=".45" stopColor="#B4508F" /><stop offset="1" stopColor="#FC8768" />
            </linearGradient>
            <filter id="ix-glow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="14" /></filter>
          </defs>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="37">
            <circle className="ix-seed" cx="851" cy="603" r="18.5" fill="#5E0E51" stroke="none" />
            <g stroke="#5E0E51">
              <path className="ix d-n" pathLength="1" d="M335 603 V548 A46.5 46.5 0 0 1 428 548 V603" />
              <path className="ix d-e" pathLength="1" d="M564.5 553 A46 50 0 1 0 556 582" />
              <path className="ix d-ebar" pathLength="1" d="M473 551 H564" strokeWidth="25" />
              <path className="ix d-x1" pathLength="1" d="M606 502 L687 603" />
              <path className="ix d-x2" pathLength="1" d="M686 502 L605 603" />
              <path className="ix d-t" pathLength="1" d="M739.5 470 V583 A20 20 0 0 0 759.5 603 H771" />
              <path className="ix d-tbar" pathLength="1" d="M740 502 H771" />
              <path className="ix d-o" pathLength="1" d="M851 603 A44 50 0 1 1 851.01 603" />
            </g>
            <path className="ix d-r" pathLength="1" stroke="#FC8768" d="M1084 603 V552 Q1084 504 1131 504" />
            <path className="ix d-glow" pathLength="1" stroke="url(#ix-rib)" filter="url(#ix-glow)" opacity=".55" d={RIBBON_D} />
            <path className="ix d-rib" pathLength="1" stroke="url(#ix-rib)" d={RIBBON_D} />
            <path className="d-h" stroke="#FC8768" strokeOpacity=".9" d="M947 457.5 V603" />
          </g>
        </svg>
        <div className="intro__sheen" aria-hidden="true"></div>
        <p className="intro__tag"><span>HR,</span> <em>in flow.</em></p>
      </div>
      <div className="intro__bar"><span></span></div>
      <button className="intro__skip" type="button" tabIndex={-1}>Skip</button>
    </div>
  );
}
