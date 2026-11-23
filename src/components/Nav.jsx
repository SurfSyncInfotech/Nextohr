import { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo.jsx';

const LINKS = [['#product', 'Product'], ['#features', 'Features'], ['#film', 'Film'], ['#plans', 'Plans'], ['#faq', 'FAQ']];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const burger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); burger.current?.focus(); } };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="nav" id="nav">
      <div className="nav__pill">
        <a href="#top" className="nav__logo" aria-label="Nextohr home">
          <Logo id="navLogo" aria-hidden="true" />
        </a>
        <nav className="nav__links" aria-label="Primary">
          {LINKS.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
        </nav>
        <div className="nav__cta">
          <a href="#signin" className="link-quiet">Sign in</a>
          <a href="#demo" className="btn btn--plum btn--sm">Book a demo</a>
          <button ref={burger} className="nav__burger" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mnav" onClick={() => setOpen((o) => !o)}>
            <span></span><span></span>
          </button>
        </div>
      </div>
      <div className="mnav" id="mnav" hidden={!open}>
        {LINKS.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
        <a href="#demo" className="btn btn--plum" onClick={() => setOpen(false)}>Book a demo</a>
      </div>
    </header>
  );
}
