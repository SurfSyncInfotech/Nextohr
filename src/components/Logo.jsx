// Exact Nextohr logo, rebuilt stroke-by-stroke from the approved PNG.
// <LogoDefs/> is rendered once; <Logo/> references it anywhere on the page.

export const RIBBON_D = 'M851 603 C885 603 900 590 912 565 C930 528 955 504 991.5 504 A44.5 50 0 0 1 1036 554 V603';
export const WIDE_RIBBON_D = 'M-40 520 C 260 520 380 470 520 330 C 680 170 860 90 1080 90 C 1300 90 1420 200 1640 200';

export function LogoDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="nx-rib" gradientUnits="userSpaceOnUse" x1="851" y1="0" x2="975" y2="0">
          <stop offset="0" stopColor="#5E0E51" /><stop offset=".45" stopColor="#B4508F" /><stop offset="1" stopColor="#FC8768" />
        </linearGradient>
        <symbol id="nx-logo" viewBox="296 428 876 212">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="37">
            <g stroke="#5E0E51">
              <path d="M335 603 V548 A46.5 46.5 0 0 1 428 548 V603" /><path d="M473 551 H564" strokeWidth="25" /><path d="M564.5 553 A46 50 0 1 0 556 582" />
              <path d="M606 502 L687 603" /><path d="M686 502 L605 603" /><path d="M739.5 470 V583 A20 20 0 0 0 759.5 603 H771" /><path d="M740 502 H771" />
              <ellipse cx="851" cy="553" rx="44" ry="50" />
            </g>
            <path stroke="#FC8768" d="M1084 603 V552 Q1084 504 1131 504" />
            <path stroke="url(#nx-rib)" d={RIBBON_D} />
            <path stroke="#FC8768" strokeOpacity=".9" d="M947 457.5 V603" />
          </g>
        </symbol>
        <linearGradient id="nx-rib-wide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5E0E51" /><stop offset=".5" stopColor="#B4508F" /><stop offset="1" stopColor="#FC8768" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo(props) {
  return (
    <svg viewBox="0 0 876 212" {...props}>
      <use href="#nx-logo" />
    </svg>
  );
}
